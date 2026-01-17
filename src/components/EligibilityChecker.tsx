import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, ArrowRight, ArrowLeft, ClipboardCheck, 
  Users, Leaf, IndianRupee, FileCheck, Sparkles, RotateCcw
} from "lucide-react";

interface EligibilityQuestion {
  id: string;
  question: string;
  type: "single" | "multiple" | "range" | "boolean";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  unit?: string;
  helpText?: string;
}

interface EligibilityAnswers {
  [key: string]: string | string[] | number | boolean;
}

interface Scheme {
  name: string;
  name_hindi?: string;
  type: "central" | "state" | "district";
  category: "subsidy" | "insurance" | "loan" | "direct_benefit" | "infrastructure" | "training" | "market_support";
  description: string;
  benefits: string[];
  benefit_amount?: string;
  eligibility: string[];
  documents_required?: string[];
  application_deadline?: string;
  is_deadline_approaching?: boolean;
  days_remaining?: number;
  status: "open" | "closing_soon" | "closed" | "upcoming";
  how_to_apply: string;
  apply_link?: string;
  helpline?: string;
  is_new?: boolean;
  priority?: "high" | "medium" | "low";
}

interface EligibilityCheckerProps {
  schemes: Scheme[];
  onEligibleSchemes: (schemes: Scheme[]) => void;
}

const QUESTIONS: EligibilityQuestion[] = [
  {
    id: "land_holding",
    question: "How much agricultural land do you own?",
    type: "single",
    options: [
      { value: "marginal", label: "Less than 1 hectare (Marginal Farmer)" },
      { value: "small", label: "1-2 hectares (Small Farmer)" },
      { value: "semi_medium", label: "2-4 hectares (Semi-Medium Farmer)" },
      { value: "medium", label: "4-10 hectares (Medium Farmer)" },
      { value: "large", label: "More than 10 hectares (Large Farmer)" },
      { value: "landless", label: "No land (Agricultural Laborer)" },
    ],
    helpText: "Your land holding category determines eligibility for many schemes"
  },
  {
    id: "farmer_category",
    question: "Which category do you belong to?",
    type: "multiple",
    options: [
      { value: "sc", label: "Scheduled Caste (SC)" },
      { value: "st", label: "Scheduled Tribe (ST)" },
      { value: "obc", label: "Other Backward Class (OBC)" },
      { value: "general", label: "General Category" },
      { value: "minority", label: "Minority Community" },
      { value: "women", label: "Women Farmer" },
      { value: "bpl", label: "Below Poverty Line (BPL)" },
    ],
    helpText: "Select all that apply - special schemes are available for various categories"
  },
  {
    id: "annual_income",
    question: "What is your annual household income?",
    type: "single",
    options: [
      { value: "below_1lakh", label: "Below ₹1 Lakh" },
      { value: "1_2lakh", label: "₹1-2 Lakh" },
      { value: "2_5lakh", label: "₹2-5 Lakh" },
      { value: "5_10lakh", label: "₹5-10 Lakh" },
      { value: "above_10lakh", label: "Above ₹10 Lakh" },
    ],
    helpText: "Income criteria is important for many subsidy schemes"
  },
  {
    id: "crops_grown",
    question: "What types of crops do you grow?",
    type: "multiple",
    options: [
      { value: "cereals", label: "Cereals (Rice, Wheat, Maize)" },
      { value: "pulses", label: "Pulses (Dal, Gram, Lentils)" },
      { value: "oilseeds", label: "Oilseeds (Groundnut, Soybean)" },
      { value: "vegetables", label: "Vegetables" },
      { value: "fruits", label: "Fruits & Horticulture" },
      { value: "cotton", label: "Cotton" },
      { value: "sugarcane", label: "Sugarcane" },
      { value: "spices", label: "Spices & Condiments" },
    ],
    helpText: "Different crops have specific support schemes"
  },
  {
    id: "has_bank_account",
    question: "Do you have a bank account linked to Aadhaar?",
    type: "boolean",
    helpText: "Required for direct benefit transfer schemes"
  },
  {
    id: "has_kcc",
    question: "Do you have a Kisan Credit Card (KCC)?",
    type: "boolean",
    helpText: "KCC holders may be eligible for additional benefits"
  },
  {
    id: "interests",
    question: "What kind of support are you looking for?",
    type: "multiple",
    options: [
      { value: "subsidy", label: "Equipment/Input Subsidies" },
      { value: "insurance", label: "Crop Insurance" },
      { value: "loan", label: "Farm Loans" },
      { value: "direct_benefit", label: "Direct Cash Benefits" },
      { value: "infrastructure", label: "Farm Infrastructure" },
      { value: "training", label: "Training & Skill Development" },
      { value: "market_support", label: "Market Access & Storage" },
    ],
    helpText: "We'll prioritize schemes matching your needs"
  },
  {
    id: "irrigation_type",
    question: "What is your primary irrigation source?",
    type: "single",
    options: [
      { value: "rainfed", label: "Rainfed (No irrigation)" },
      { value: "well", label: "Well / Borewell" },
      { value: "canal", label: "Canal Irrigation" },
      { value: "drip", label: "Drip / Sprinkler Irrigation" },
      { value: "river", label: "River / Tank" },
    ],
    helpText: "Irrigation schemes vary based on current infrastructure"
  },
];

const EligibilityChecker = ({ schemes, onEligibleSchemes }: EligibilityCheckerProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<EligibilityAnswers>({});
  const [showResults, setShowResults] = useState(false);
  const [eligibleSchemes, setEligibleSchemes] = useState<Scheme[]>([]);
  const [matchScores, setMatchScores] = useState<Map<string, number>>(new Map());

  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;
  const currentQuestion = QUESTIONS[currentStep];

  const handleSingleAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleMultipleAnswer = (value: string, checked: boolean) => {
    const current = (answers[currentQuestion.id] as string[]) || [];
    if (checked) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: [...current, value] }));
    } else {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: current.filter(v => v !== value) }));
    }
  };

  const handleBooleanAnswer = (value: boolean) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const canProceed = () => {
    const answer = answers[currentQuestion.id];
    if (currentQuestion.type === "multiple") {
      return Array.isArray(answer) && answer.length > 0;
    }
    if (currentQuestion.type === "boolean") {
      return typeof answer === "boolean";
    }
    return !!answer;
  };

  const calculateEligibility = () => {
    const scores = new Map<string, number>();
    const eligible: Scheme[] = [];

    schemes.forEach(scheme => {
      let score = 0;
      let maxScore = 0;

      // Check land holding
      const landHolding = answers.land_holding as string;
      if (landHolding) {
        maxScore += 20;
        const eligibilityText = scheme.eligibility.join(" ").toLowerCase();
        if (landHolding === "marginal" || landHolding === "small") {
          if (eligibilityText.includes("small") || eligibilityText.includes("marginal") || !eligibilityText.includes("large")) {
            score += 20;
          }
        } else if (landHolding === "landless") {
          if (eligibilityText.includes("laborer") || eligibilityText.includes("landless")) {
            score += 20;
          }
        } else {
          score += 15;
        }
      }

      // Check category
      const categories = answers.farmer_category as string[];
      if (categories && categories.length > 0) {
        maxScore += 15;
        const eligibilityText = scheme.eligibility.join(" ").toLowerCase();
        if (categories.includes("sc") && eligibilityText.includes("sc")) score += 15;
        else if (categories.includes("st") && eligibilityText.includes("st")) score += 15;
        else if (categories.includes("women") && eligibilityText.includes("women")) score += 15;
        else if (categories.includes("bpl") && eligibilityText.includes("bpl")) score += 15;
        else score += 10;
      }

      // Check income
      const income = answers.annual_income as string;
      if (income) {
        maxScore += 15;
        const eligibilityText = scheme.eligibility.join(" ").toLowerCase();
        if (income === "below_1lakh" || income === "1_2lakh") {
          if (!eligibilityText.includes("high income") && !eligibilityText.includes("above 10 lakh")) {
            score += 15;
          }
        } else {
          score += 10;
        }
      }

      // Check interests matching
      const interests = answers.interests as string[];
      if (interests && interests.length > 0) {
        maxScore += 25;
        if (interests.includes(scheme.category)) {
          score += 25;
        } else {
          score += 5;
        }
      }

      // Check bank account
      if (answers.has_bank_account === true) {
        maxScore += 10;
        score += 10;
      }

      // Check KCC
      if (answers.has_kcc === true && scheme.category === "loan") {
        maxScore += 10;
        score += 10;
      }

      // Prefer open schemes
      if (scheme.status === "open") {
        score += 10;
      } else if (scheme.status === "closing_soon") {
        score += 5;
      }

      const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
      scores.set(scheme.name, finalScore);

      if (finalScore >= 40 && scheme.status !== "closed") {
        eligible.push(scheme);
      }
    });

    // Sort by score
    eligible.sort((a, b) => (scores.get(b.name) || 0) - (scores.get(a.name) || 0));

    setMatchScores(scores);
    setEligibleSchemes(eligible);
    onEligibleSchemes(eligible);
    setShowResults(true);
  };

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      calculateEligibility();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResults(false);
    setEligibleSchemes([]);
    setMatchScores(new Map());
    onEligibleSchemes([]);
  };

  if (showResults) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle className="h-6 w-6" />
            Eligibility Results
          </CardTitle>
          <CardDescription>
            Based on your answers, here are the schemes you may be eligible for
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500 rounded-full">
                <FileCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{eligibleSchemes.length}</p>
                <p className="text-sm text-muted-foreground">Schemes you qualify for</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Check Again
            </Button>
          </div>

          {eligibleSchemes.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">TOP MATCHES</p>
              {eligibleSchemes.slice(0, 5).map((scheme, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{scheme.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {scheme.category.replace("_", " ")}
                        </Badge>
                        {scheme.benefit_amount && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                            <IndianRupee className="h-3 w-3 mr-0.5" />
                            {scheme.benefit_amount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{matchScores.get(scheme.name) || 0}%</p>
                    <p className="text-xs text-muted-foreground">Match</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {eligibleSchemes.length === 0 && (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No matching schemes found based on your criteria.</p>
              <Button variant="link" onClick={handleReset}>
                Try with different answers
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Eligibility Checker
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Question {currentStep + 1} of {QUESTIONS.length}
          </Badge>
        </div>
        <CardDescription>
          Answer a few questions to find schemes you qualify for
        </CardDescription>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            {currentQuestion.id === "land_holding" && <Leaf className="h-5 w-5 text-primary mt-0.5" />}
            {currentQuestion.id === "farmer_category" && <Users className="h-5 w-5 text-primary mt-0.5" />}
            {currentQuestion.id === "annual_income" && <IndianRupee className="h-5 w-5 text-primary mt-0.5" />}
            {currentQuestion.id === "interests" && <Sparkles className="h-5 w-5 text-primary mt-0.5" />}
            <div className="flex-1">
              <h3 className="text-lg font-medium">{currentQuestion.question}</h3>
              {currentQuestion.helpText && (
                <p className="text-sm text-muted-foreground mt-1">{currentQuestion.helpText}</p>
              )}
            </div>
          </div>

          {currentQuestion.type === "single" && currentQuestion.options && (
            <RadioGroup 
              value={answers[currentQuestion.id] as string || ""} 
              onValueChange={handleSingleAnswer}
              className="space-y-2"
            >
              {currentQuestion.options.map(option => (
                <div 
                  key={option.value} 
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === option.value 
                      ? "border-primary bg-primary/5" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleSingleAnswer(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="cursor-pointer flex-1">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion.type === "multiple" && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map(option => {
                const currentAnswers = (answers[currentQuestion.id] as string[]) || [];
                const isChecked = currentAnswers.includes(option.value);
                return (
                  <div 
                    key={option.value} 
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isChecked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleMultipleAnswer(option.value, !isChecked)}
                  >
                    <Checkbox 
                      id={option.value} 
                      checked={isChecked}
                      onCheckedChange={(checked) => handleMultipleAnswer(option.value, checked as boolean)}
                    />
                    <Label htmlFor={option.value} className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}

          {currentQuestion.type === "boolean" && (
            <div className="flex gap-4">
              <Button 
                variant={answers[currentQuestion.id] === true ? "default" : "outline"}
                className="flex-1 h-16"
                onClick={() => handleBooleanAnswer(true)}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Yes
              </Button>
              <Button 
                variant={answers[currentQuestion.id] === false ? "default" : "outline"}
                className="flex-1 h-16"
                onClick={() => handleBooleanAnswer(false)}
              >
                No
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button 
            variant="outline" 
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-2"
          >
            {currentStep === QUESTIONS.length - 1 ? "Check Eligibility" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EligibilityChecker;
