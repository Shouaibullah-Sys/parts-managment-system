// app/api/parts/[id]/inventory-history/route.ts

import { NextRequest, NextResponse } from "next/server";
import { partsQueries } from "@/lib/parts-service";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (isNaN(partId)) {
      return NextResponse.json(
        { success: false, error: "Invalid part ID" },
        { status: 400 }
      );
    }

    const history = await partsQueries.getPartInventoryHistory(partId, {
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: history.history,
      pagination: history.pagination,
    });
  } catch (error) {
    console.error("Error fetching inventory history:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
