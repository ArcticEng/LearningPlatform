import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import { v4 as uuid } from "uuid";

const PAYSTACK_SECRET = () => process.env.PAYSTACK_SECRET_KEY;

// POST /api/payments - initialize payment with split
export async function POST(req) {
  const { tenantSlug, courseId, email, name, idNumber, phone, bookingSlotId } = await req.json();

  if (!tenantSlug || !courseId || !email) {
    return NextResponse.json({ error: "tenantSlug, courseId, and email are required" }, { status: 400 });
  }

  if (!PAYSTACK_SECRET()) {
    return NextResponse.json({ error: "Payment system not configured" }, { status: 500 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug.toLowerCase().trim() } });
  if (!tenant) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  if (!tenant.active) return NextResponse.json({ error: "Organization disabled" }, { status: 403 });
  if (!tenant.featurePayments) return NextResponse.json({ error: "Payments not enabled" }, { status: 403 });
  if (!tenant.paystackSubaccount) return NextResponse.json({ error: "Payment account not configured for this organization" }, { status: 500 });

  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId: tenant.id } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (course.price <= 0) return NextResponse.json({ error: "This course is free" }, { status: 400 });

  // Check enrollment cap
  if (tenant.featureCourseCap && course.maxEnrollment > 0 && course.enrolledCount >= course.maxEnrollment) {
    return NextResponse.json({ error: "This course is fully enrolled. No spots remaining." }, { status: 400 });
  }

  const ref = `PAY-${uuid().slice(0, 8).toUpperCase()}`;
  const reqUrl = new URL(req.url);
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;

  // Initialize Paystack transaction with SPLIT
  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: course.price, // in cents
      currency: course.currency || "ZAR",
      reference: ref,
      callback_url: `${baseUrl}/${tenantSlug}/payment/verify?ref=${ref}`,
      // SPLIT PAYMENT: subaccount gets (100 - platformFeePercent)%, Onyx Digital keeps platformFeePercent%
      subaccount: tenant.paystackSubaccount,
      bearer: "account", // Onyx Digital (main account) bears Paystack fees
      metadata: {
        tenantId: tenant.id,
        courseId: course.id,
        courseName: course.title,
        studentName: name || "",
        studentIdNumber: idNumber || "",
        studentPhone: phone || "",
        bookingSlotId: bookingSlotId || "",
        tenantSlug,
        platformFee: `${tenant.platformFeePercent || 10}%`,
      },
    }),
  });

  const paystackData = await paystackRes.json();

  if (!paystackData.status) {
    return NextResponse.json({ error: paystackData.message || "Payment initialization failed" }, { status: 500 });
  }

  // Store payment record
  await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      courseId: course.id,
      email,
      name: name || "",
      idNumber: idNumber || "",
      amount: course.price,
      currency: course.currency || "ZAR",
      paystackRef: ref,
      paystackAccess: paystackData.data.access_code || "",
    },
  });

  return NextResponse.json({
    authorizationUrl: paystackData.data.authorization_url,
    accessCode: paystackData.data.access_code,
    reference: ref,
  });
}

// GET /api/payments?ref=xxx - verify payment and create account
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");

  if (!ref) return NextResponse.json({ error: "Reference required" }, { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { paystackRef: ref } });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  if (payment.status === "success") {
    return NextResponse.json({ status: "success", message: "Payment already verified" });
  }

  if (!PAYSTACK_SECRET()) {
    return NextResponse.json({ error: "Payment verification not configured" }, { status: 500 });
  }

  // Verify with Paystack using Onyx Digital's master key
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET()}` },
  });
  const verifyData = await verifyRes.json();

  if (!verifyData.status || verifyData.data.status !== "success") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
    return NextResponse.json({ status: "failed", message: "Payment was not successful" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: payment.tenantId } });

  // Payment successful — create learner account if not exists
  let user = await prisma.user.findFirst({
    where: { idNumber: payment.idNumber || payment.email, tenantId: tenant.id },
  });

  if (!user) {
    const tempPassword = uuid().slice(0, 8);
    user = await prisma.user.create({
      data: {
        name: payment.name || payment.email.split("@")[0],
        idNumber: payment.idNumber || payment.email,
        password: await bcrypt.hash(tempPassword, 10),
        role: "learner",
        tenantId: tenant.id,
      },
    });
  }

  // Grant course access
  await prisma.courseAccess.create({
    data: { userId: user.id, courseId: payment.courseId, tenantId: tenant.id },
  }).catch(() => {});

  // If this is a bundle, also grant access to all included courses
  const purchasedCourse = await prisma.course.findUnique({ where: { id: payment.courseId } });
  if (purchasedCourse?.isBundle && purchasedCourse.bundleCourseIds) {
    const bundleIds = purchasedCourse.bundleCourseIds.split(",").map(id => id.trim()).filter(Boolean);
    for (const cid of bundleIds) {
      await prisma.courseAccess.create({
        data: { userId: user.id, courseId: cid, tenantId: tenant.id },
      }).catch(() => {});
      await prisma.course.update({ where: { id: cid }, data: { enrolledCount: { increment: 1 } } }).catch(() => {});
    }
  }

  // Increment enrolled count
  await prisma.course.update({ where: { id: payment.courseId }, data: { enrolledCount: { increment: 1 } } }).catch(() => {});

  // Create booking if a slot was selected
  const metadata = verifyData.data.metadata || {};
  if (metadata.bookingSlotId) {
    try {
      await fetch(new URL("/api/bookings", req.url).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: metadata.bookingSlotId,
          studentName: payment.name,
          studentEmail: payment.email,
          studentPhone: metadata.studentPhone || "",
          studentId: payment.idNumber,
          courseId: payment.courseId,
          tenantSlug: tenant.slug,
          userId: user.id,
          paymentId: payment.id,
        }),
      });
    } catch (e) {
      console.error("[BOOKING] Failed to create after payment:", e.message);
    }
  }

  // Update payment record
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "success", userId: user.id },
  });

  // Auto-login
  const token = signToken({ id: user.id, role: user.role });
  setSessionCookie(token, tenant.slug);

  return NextResponse.json({
    status: "success",
    user: { id: user.id, name: user.name, role: user.role },
    tenantSlug: tenant.slug,
  });
}
