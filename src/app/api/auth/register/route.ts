import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApiError, createSuccessResponse } from "@/lib/api-errors";
import {
  validateAndSanitize,
  RegistrationSchema,
} from "@/lib/validation-schemas";
import { prisma } from "@/server-lib/prisma";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate registration data
    const validatedData = validateAndSanitize(RegistrationSchema, body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with this email already exists",
          code: "USER_EXISTS",
        },
        { status: 409 },
      );
    }

    // Create user using Better Auth
    const signUpResult = await auth.api.signUp({
      body: {
        email: validatedData.email,
        password: validatedData.password,
        name: validatedData.name,
      },
    });

    // Return success response
    return createSuccessResponse(
      {
        user: {
          id: signUpResult.user.id,
          email: signUpResult.user.email,
          name: signUpResult.user.name,
        },
      },
      "Account created successfully",
    );
  } catch (error) {
    // Handle Better Auth errors
    if (error && typeof error === "object" && "status" in error) {
      const authError = error as { status?: number; message?: string };
      if (authError.status === 400 || authError.status === 409) {
        return NextResponse.json(
          {
            error: authError.message || "Registration failed",
            code: "AUTH_ERROR",
          },
          { status: authError.status },
        );
      }
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return handleApiError(error as Error);
  }
}
