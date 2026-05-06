import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

// POST /api/superadmin/create-subaccount - create Paystack subaccount for a tenant
export async function POST(req) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET) return NextResponse.json({ error: "PAYSTACK_SECRET_KEY not configured in environment" }, { status: 500 });

  const { tenantId, businessName, bankCode, accountNumber, percentageCharge, description } = await req.json();

  if (!tenantId || !businessName || !bankCode || !accountNumber) {
    return NextResponse.json({ error: "tenantId, businessName, bankCode, and accountNumber are required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  // Create subaccount on Paystack
  const res = await fetch("https://api.paystack.co/subaccount", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      business_name: businessName,
      bank_code: bankCode,
      account_number: accountNumber,
      percentage_charge: percentageCharge || 10, // % that goes to main account (Onyx Digital)
      description: description || `Subaccount for ${tenant.name}`,
    }),
  });

  const data = await res.json();

  if (!data.status) {
    return NextResponse.json({ error: data.message || "Failed to create subaccount" }, { status: 500 });
  }

  // Save subaccount code to tenant
  const subaccountCode = data.data.subaccount_code;
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      paystackSubaccount: subaccountCode,
      platformFeePercent: percentageCharge || 10,
    },
  });

  return NextResponse.json({
    subaccountCode,
    accountName: data.data.account_name || data.data.business_name,
    bank: data.data.settlement_bank,
    message: `Subaccount created: ${subaccountCode}`,
  });
}

// GET /api/superadmin/create-subaccount - list SA banks from Paystack
export async function GET() {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET) return NextResponse.json({ error: "PAYSTACK_SECRET_KEY not configured" }, { status: 500 });

  const res = await fetch("https://api.paystack.co/bank?country=south_africa", {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  const data = await res.json();

  if (!data.status) return NextResponse.json({ error: "Failed to fetch banks" }, { status: 500 });

  const banks = (data.data || []).map(b => ({ code: b.code, name: b.name })).sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ banks });
}
