import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await auth.api.getSession({ headers: req.headers });
    let user = null;
    if (!session) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });
    } catch (error) {
        return NextResponse.json({ ok: false, error: "Failed to retrieve user" }, { status: 500 });
    }
    const apiKey = user?.cf_api ?? "";
    return NextResponse.json({ ok: true, apiKey }, { status: 200 });
}

export async function POST(req: Request) {
const session = await auth.api.getSession({ headers: req.headers });
if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}
    const body = await req.json();
    if(!body.apiKey) {
        return NextResponse.json({ ok: false, error: "Missing apiKey!" }, { status: 400 });
    }
    try {
        body.apiKey = body.apiKey.trim();
        await prisma.user.update({
            where: { id: session.user.id },
            data: { cf_api: body.apiKey },
        });
        return NextResponse.json(
            { ok: true, message: "API key updated successfully." },
            { status: 200 }
        );
        } catch (err: any) {
            return NextResponse.json(
            { ok: false, error: err?.message ?? "Error updating API key" },
            { status: 400 }
        );
    }
}