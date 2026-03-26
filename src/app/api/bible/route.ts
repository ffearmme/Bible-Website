import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const API_KEY = process.env.NEXT_PUBLIC_BIBLE_API_KEY;
const BASE_URL = "https://api.scripture.api.bible/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path query" }, { status: 400 });
  }

  // Build the full URL, including any other query params
  const fullUrl = new URL(`${BASE_URL}${path}`);
  searchParams.forEach((value, key) => {
    if (key !== "path") {
      fullUrl.searchParams.append(key, value);
    }
  });

  try {
    const response = await axios.get(fullUrl.toString(), {
      headers: {
        "api-key": API_KEY,
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("API Proxy Error:", error.response?.data || error.message);
    return NextResponse.json(
      error.response?.data || { error: "Internal Server Error" },
      { status: error.response?.status || 500 }
    );
  }
}
