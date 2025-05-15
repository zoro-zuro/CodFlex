import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("⚡ Registering Clerk HTTP webhook handler...");

const genAi = new GoogleGenerativeAI(process.env.GEMENI_API_KEY!);
const http = httpRouter();

http.route({
  path: "/api/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("📥 Incoming POST request to /clerk-users-webhook");

    const event = await validateRequest(request);
    if (!event) {
      console.error("❌ Webhook validation failed or event is null.");
      return new Response("Error occurred", { status: 400 });
    }

    console.log("✅ Validated webhook event:", event.type);
    console.log("📦 Event data:", JSON.stringify(event.data));

    switch (event.type) {
      case "user.created":
        console.log("📌 Running upsertFromClerk create mutation...");
        await ctx.runMutation((internal as any).users.upsertFromClerk, {
          data: event.data,
        });
        break;

      case "user.updated":
        console.log("📌 Running upsertFromClerk update mutation...");

        const { id, email_addresses, first_name, last_name, image_url } =
          event.data;

        const email = email_addresses[0].email_address;
        const name = `${first_name || ""} ${last_name || ""}`.trim();
        await ctx.runMutation((internal as any).users.updateUser, {
          clerkId: id,
          email,
          name,
          image: image_url,
        });
        break;

      default:
        console.log("⚠️ Ignored Clerk webhook event:", event.type);
    }

    return new Response("Webhook processed", { status: 200 });
  }),
});

// validate and fix workout plan to ensure it has proper numeric types
function validateWorkoutPlan(plan: any) {
  const validatedPlan = {
    schedule: plan.schedule,
    exercises: plan.exercises.map((exercise: any) => ({
      day: exercise.day,
      routines: exercise.routines.map((routine: any) => ({
        name: routine.name,
        sets:
          typeof routine.sets === "number"
            ? routine.sets
            : parseInt(routine.sets) || 1,
        reps:
          typeof routine.reps === "number"
            ? routine.reps
            : parseInt(routine.reps) || 10,
      })),
    })),
  };
  return validatedPlan;
}

// validate diet plan to ensure it strictly follows schema
function validateDietPlan(plan: any) {
  // only keep the fields we want
  const validatedPlan = {
    dailyCalories: plan.dailyCalories,
    meals: plan.meals.map((meal: any) => ({
      name: meal.name,
      foods: meal.foods,
    })),
  };
  return validatedPlan;
}

http.route({
  path: "/api/vapi/generate-program",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      console.log("📥 Incoming POST request to /generate-program:", payload);

      const {
        user_id,
        age,
        height,
        weight,
        injuries,
        workout_days,
        fitness_goal,
        fitness_level,
        dietary_restrictions,
      } = payload;

      // gemini model
      const model = genAi.getGenerativeModel({
        model: "gemini-2.0-flash-001",
        generationConfig: {
          temperature: 0.4,
          topP: 0.8,
          responseMimeType: "application/json",
        },
        systemInstruction: {
          role: "system",
          parts: [
            {
              text: "You are a fitness and nutrition expert that provides helpful advice.",
            },
          ],
        },
      });

      const workoutPrompt = `You are an experienced fitness coach creating a personalized workout plan based on:
        Age: ${age}
        Height: ${height}
        Weight: ${weight}
        Injuries or limitations: ${injuries}
        Available days for workout: ${workout_days}
        Fitness goal: ${fitness_goal}
        Fitness level: ${fitness_level}
        
        As a professional coach:
        - Consider muscle group splits to avoid overtraining the same muscles on consecutive days
        - Design exercises that match the fitness level and account for any injuries
        - Structure the workouts to specifically target the user's fitness goal
        
        CRITICAL SCHEMA INSTRUCTIONS:
        - Your output MUST contain ONLY the fields specified below, NO ADDITIONAL FIELDS
        - "sets" and "reps" MUST ALWAYS be NUMBERS, never strings
        - For example: "sets": 3, "reps": 10
        - Do NOT use text like "reps": "As many as possible" or "reps": "To failure"
        - Instead use specific numbers like "reps": 12 or "reps": 15
        - For cardio, use "sets": 1, "reps": 1 or another appropriate number
        - NEVER include strings for numerical fields
        - NEVER add extra fields not shown in the example below
        
        Return a JSON object with this EXACT structure:
        {
          "schedule": ["Monday", "Wednesday", "Friday"],
          "exercises": [
            {
              "day": "Monday",
              "routines": [
                {
                  "name": "Exercise Name",
                  "sets": 3,
                  "reps": 10
                }
              ]
            }
          ]
        }
        
        DO NOT add any fields that are not in this example. Your response must be a valid JSON object with no additional text.`;

      const workoutResult = await model.generateContent(workoutPrompt);
      console.log("🏋️‍♂️ Generated workout plan:", workoutResult);
      const workoutPlanText = workoutResult.response.text();

      // validate and fix the workout plan
      let workoutPlan = JSON.parse(workoutPlanText);
      workoutPlan = validateWorkoutPlan(workoutPlan);
      console.log("✅ Validated workout plan:", workoutPlan);

      const dietPrompt = `You are an experienced nutrition coach creating a personalized diet plan based on:
        Age: ${age}
        Height: ${height}
        Weight: ${weight}
        Fitness goal: ${fitness_goal}
        Dietary restrictions: ${dietary_restrictions}
        
        As a professional nutrition coach:
        - Calculate appropriate daily calorie intake based on the person's stats and goals
        - Create a balanced meal plan with proper macronutrient distribution
        - Include a variety of nutrient-dense foods while respecting dietary restrictions
        - Consider meal timing around workouts for optimal performance and recovery
        
        CRITICAL SCHEMA INSTRUCTIONS:
        - Your output MUST contain ONLY the fields specified below, NO ADDITIONAL FIELDS
        - "dailyCalories" MUST be a NUMBER, not a string
        - DO NOT add fields like "supplements", "macros", "notes", or ANYTHING else
        - ONLY include the EXACT fields shown in the example below
        - Each meal should include ONLY a "name" and "foods" array

        Return a JSON object with this EXACT structure and no other fields:
        {
          "dailyCalories": 2000,
          "meals": [
            {
              "name": "Breakfast",
              "foods": ["Oatmeal with berries", "Greek yogurt", "Black coffee"]
            },
            {
              "name": "Lunch",
              "foods": ["Grilled chicken salad", "Whole grain bread", "Water"]
            }
          ]
        }
        
        DO NOT add any fields that are not in this example. Your response must be a valid JSON object with no additional text.`;

      const dietResult = await model.generateContent(dietPrompt);
      console.log("🥗 Generated diet plan:", dietResult);
      const dietPlanText = dietResult.response.text();
      // validate and fix the diet plan
      let dietPlan = JSON.parse(dietPlanText);
      dietPlan = validateDietPlan(dietPlan);
      console.log("✅ Validated diet plan:", dietPlan);
      // save the plans to the database
      console.log("📦 Saving plans to the database...");
      const planId = await ctx.runMutation(internal.plans.createPlan, {
        userId: user_id,
        name: `${fitness_goal} Plan - ${new Date().toLocaleDateString()}`,
        workoutPlan: workoutPlan,
        dietPlan: dietPlan,
        isActive: true,
      });

      console.log("✅ Plans saved with ID:", planId);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            planId,
            workoutPlan,
            dietPlan,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("❌ Error in /generate-program:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "An error occurred while generating the program.",
          errorDetails: error,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }),
});
async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  console.log("🔒 Validating Clerk webhook request...");

  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };

  console.log("🔐 Received SVIX headers:", svixHeaders);

  const secret = process.env.CLERK_WEBHOOK_SECRET!;
  if (!secret) {
    console.error("❗ CLERK_WEBHOOK_SECRET is missing in environment!");
    return null;
  }

  const wh = new Webhook(secret);
  try {
    const verified = wh.verify(
      payloadString,
      svixHeaders
    ) as unknown as WebhookEvent;
    console.log("✅ Webhook signature verified.");
    return verified;
  } catch (error) {
    console.error("❌ Error verifying webhook:", error);
    return null;
  }
}

export default http;
