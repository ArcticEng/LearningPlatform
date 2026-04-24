import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import { v4 as uuid } from "uuid";

// POST /api/payments - initialize payment
export async function POST(req) {
  const { tenantSlug, courseId, email, name, idNumber } = await req.json();

  if (!tenantSlug || !courseId || !email) {
    return NextResponse.json({ error: "tenantSlug, courseId, and email are required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug.toLowerCase().trim() } });
  if (!tenant) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  if (!tenant.active) return NextResponse.json({ error: "Organization disabled" }, { status: 403 });
  if (!tenant.featurePayments) return NextResponse.json({ error: "Payments not enabled" }, { status: 403 });
  if (!tenant.paystackSecretKey) return NextResponse.json({ error: "Payment not configured" }, { status: 500 });

  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId: tenant.id } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (course.price <= 0) return NextResponse.json({ error: "This course is free" }, { status: 400 });

  const ref = `PAY-${uuid().slice(0, 8).toUpperCase()}`;

  // Derive base URL from request
  const reqUrl = new URL(req.url);
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;

  // Initialize Paystack transaction
  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tenant.paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: course.price,
      currency: course.currency || "ZAR",
      reference: ref,
      callback_url: `${baseUrl}/${tenantSlug}/payment/verify?ref=${ref}`,
      metadata: {
        tenantId: tenant.id,
        courseId: course.id,
        courseName: course.title,
        studentName: name || "",
        studentIdNumber: idNumber || "",
        tenantSlug,
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

  const tenant = await prisma.tenant.findUnique({ where: { id: payment.tenantId } });
  if (!tenant?.paystackSecretKey) {
    return NextResponse.json({ error: "Payment verification not configured" }, { status: 500 });
  }

  // Verify with Paystack
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, {
    headers: { Authorization: `Bearer ${tenant.paystackSecretKey}` },
  });
  const verifyData = await verifyRes.json();

  if (!verifyData.status || verifyData.data.status !== "success") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
    return NextResponse.json({ status: "failed", message: "Payment was not successful" }, { status: 400 });
  }

  // Payment successful — create learner account if not exists
  let user = await prisma.user.findFirst({
    where: { idNumber: payment.idNumber || payment.email, tenantId: tenant.id },
  });

  if (!user) {
    // Generate a default password (they'll need to set it via the registration form or admin can reset)
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
  }).catch(() => {}); // ignore if already granted

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
