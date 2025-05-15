"use client";
import CornerElements from "@/components/CornerElements";
import NoFitnessPlan from "@/components/NoFitnessPlan";
import ProfileHeader from "@/components/ProfileHeader";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { useQuery } from "convex/react";
import {
  AppleIcon,
  ArrowBigDown,
  CalendarIcon,
  DumbbellIcon,
} from "lucide-react";
import React, { useState } from "react";

const ProfilePage = () => {
  const { user } = useUser();
  const userId = user?.id as string;
  console.log("User ID:", userId);

  const allPlans = useQuery(api.plans.getUserPlans, { userId }) || [];
  console.log("Plans:", allPlans);
  const [selectedPlan, setSelectedPlan] = useState<null | string>(null);

  const activePlans = allPlans?.find(
    (plan: { isActive: boolean }) => plan.isActive
  );
  console.log("Active Plans:", activePlans);

  const currentPlan = selectedPlan
    ? allPlans?.find((plan: { _id: string }) => plan._id === selectedPlan)
    : activePlans;

  console.log("Current Plan:", currentPlan);

  const [rotation, setRotation] = useState(0);

  const handleClick = () => {
    setRotation((prevRotation) => prevRotation + 180);
  };

  return (
    <section className="relative z-10 pt-12 pb-32 flex-grow container mx-auto px-4">
      <ProfileHeader user={user} />
      {allPlans && allPlans.length > 0 ? (
        <div className="space-y-8">
          {/* plan selector */}
          <div className="relative backdrop-blur-sm border border-border p-6">
            <CornerElements />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight">
                <span className="text-primary">Your</span>{" "}
                <span className="text-foreground"> Fitness Plans</span>
              </h2>
              <div className="font-mono text-xs text-muted-foreground">
                TOTAL: {allPlans.length}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {allPlans.map((plan) => (
                <Button
                  key={plan._id}
                  onClick={() => setSelectedPlan(plan._id)}
                  className={`text-foreground border hover:text-white ${selectedPlan === plan._id ? "bg-primary/20 text-primary border-primary" : "bg-transparent border-border hover:border-primary/50"}`}
                >
                  {plan.name}
                  {plan.isActive && (
                    <span className="text-xs text-green-500 px-2 py-0.5 rounded ml-2">
                      Active
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
          {/* planDetails */}
          {currentPlan && (
            <div className="relative backdrop-blur-sm border border-border rounded-lg p-6">
              <CornerElements />

              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <h3 className="text-lg font-bold">
                  PLAN: <span className="text-primary">{currentPlan.name}</span>
                </h3>
              </div>

              <Tabs defaultValue="workout" className="w-full">
                <TabsList className="mb-6 w-full grid grid-cols-2 bg-cyber-terminal-bg border">
                  <TabsTrigger
                    value="workout"
                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary flex items-center justify-center"
                  >
                    <DumbbellIcon className="mr-2 size-4" />
                    Workout Plan
                  </TabsTrigger>

                  <TabsTrigger
                    value="diet"
                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary flex items-center justify-center"
                  >
                    <AppleIcon className="mr-2 h-4 w-4" />
                    Diet Plan
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="workout">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <span className="font-mono text-sm text-muted-foreground">
                        SCHEDULE: {currentPlan.workoutPlan.schedule.join(", ")}
                      </span>
                    </div>

                    <Accordion type="multiple" className="space-y-4">
                      {currentPlan.workoutPlan.exercises.map(
                        (exerciseDay, index) => (
                          <AccordionItem
                            key={index}
                            value={exerciseDay.day}
                            className=" w-full border rounded-lg overflow-hidden "
                          >
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-primary/10 font-mono w-full">
                              <div className="flex justify-between w-full items-center">
                                <span className="text-primary">
                                  {exerciseDay.day}
                                </span>
                                <div className="text-xs text-muted-foreground flex gap-2 items-center">
                                  {exerciseDay.routines.length} EXERCISES
                                  <ArrowBigDown
                                    className="h-4 w-4 text-primary"
                                    style={{
                                      transform: `rotate(${rotation}deg`,
                                      transition: "0.5s ease-in-out",
                                    }}
                                    onClick={handleClick}
                                  />
                                </div>
                              </div>
                            </AccordionTrigger>

                            <AccordionContent className="pb-4 px-4">
                              <div className="space-y-3 mt-2">
                                {exerciseDay.routines.map(
                                  (routine, routineIndex) => (
                                    <div
                                      key={routineIndex}
                                      className="border border-border rounded p-3 bg-background/50"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-foreground">
                                          {routine.name}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                          <div className="px-2 py-1 rounded bg-primary/20 text-primary text-xs font-mono">
                                            {routine.sets} SETS
                                          </div>
                                          <div className="px-2 py-1 rounded bg-secondary/20 text-secondary text-xs font-mono">
                                            {routine.reps} REPS
                                          </div>
                                        </div>
                                      </div>
                                      {routine.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {routine.description}
                                        </p>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )
                      )}
                    </Accordion>
                  </div>
                </TabsContent>

                <TabsContent value="diet">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-mono text-sm text-muted-foreground">
                        DAILY CALORIE TARGET
                      </span>
                      <div className="font-mono text-xl text-primary">
                        {currentPlan.dietPlan.dailyCalories} KCAL
                      </div>
                    </div>

                    <div className="h-px w-full bg-border my-4"></div>

                    <div className="space-y-4">
                      {currentPlan.dietPlan.meals.map((meal, index) => (
                        <div
                          key={index}
                          className="border border-border rounded-lg overflow-hidden p-4"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <h4 className="font-mono text-primary">
                              {meal.name}
                            </h4>
                          </div>
                          <ul className="space-y-2">
                            {meal.foods.map((food, foodIndex) => (
                              <li
                                key={foodIndex}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                              >
                                <span className="text-xs text-primary font-mono">
                                  {String(foodIndex + 1).padStart(2, "0")}
                                </span>
                                {food}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      ) : (
        <NoFitnessPlan />
      )}
    </section>
  );
};

export default ProfilePage;
