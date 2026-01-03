import { GoogleGenerativeAI } from "@google/generative-ai";
import { useRuntimeConfig } from "#app";
import { useIdentifiedFacesStore } from "@/stores/identifiedFaces";
import type { FaceData } from "@/constants";
import type { Ref } from "vue";

// Assume these helper functions are also available, or you can move them here.
// For example, fileToGenerativePart() is likely a utility function.
const fileToGenerativePart = async (file: File) => {
  // Your file conversion logic here
  const base64EncodedImage = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result.toString().split(",")[1]);
      }
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: base64EncodedImage as string,
      mimeType: file.type,
    },
  };
};

const generateKeywords = (data: string) => {
  // Your keyword generation logic here
  console.log("Generating keywords for data:", data);
};

const generateRelatedQuestions = async (data: string) => {
  // Your related questions generation logic here
  console.log("Generating related questions for data:", data);
};

// Define the shape of the parsed JSON result for better type safety
interface ParsedResult {
  face_shape: string;
  gender: string;
  age_group: string;
}

/**
 * A composable function to handle the image identification logic.
 * It takes reactive variables from a component and updates them directly.
 *
 * @param image The reactive image file from the input.
 * @param user The reactive user object for authentication checks.
 * @param loading A reactive boolean to show/hide a loading state.
 * @param introductoryMessage A reactive string for displaying messages to the user.
 * @param result A reactive object to store the API response.
 * @param ok A callback function to be executed on success or completion.
 */
export const useIdentifyImage = (
  image: Ref<File | null>,
  user: Ref<any>, // You can use a more specific user type if you have one
  loading: Ref<boolean>,
  introductoryMessage: Ref<string | null>,
  result: Ref<ParsedResult | null>,
  ok: () => void
) => {
  const config = useRuntimeConfig();
  const identifiedFacesStore = useIdentifiedFacesStore();

  // The simplified and updatable prompt for the AI model
  const SIMPLE_AI_PROMPT = `
  ${process.env.NUXT_PUBLIC_AI_PROMPT}
{
  "face_shape": "Determine the general face shape (e.g., Oval, Round, Square, Heart, Diamond, Oblong)",
  "gender": "Identify the gender (e.g., Male, Female)",
  "age_group": "Estimate the age group (e.g., Baby, Child, Teen, 20s, 30s, 40s, 50s, 60+)"
}`;

  const identifyImage = async () => {
    console.log("🚀 identifyImage called with", image.value);
    if (!image.value) return;

    if (!user.value) {
      introductoryMessage.value = "Please log in to use this feature.";
      return;
    }
    const userEmail = user.value.primaryEmailAddress?.emailAddress;
    if (!userEmail) {
      introductoryMessage.value =
        "Could not retrieve user email. Please log in again.";
      return;
    }

    if (!identifiedFacesStore.canAddOrUpdate(userEmail)) {
      const userData = identifiedFacesStore.getUserData(userEmail);
      if (userData && userData.apiCalles >= 5) {
        introductoryMessage.value =
          "You have reached your maximum of 5 analysis attempts.";
      } else {
        introductoryMessage.value =
          "The maximum number of concurrent users has been reached. Please try again later.";
      }
      return;
    }

    loading.value = true;
    introductoryMessage.value = null;

    const genAI = new GoogleGenerativeAI(config.public.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    try {
      const imageParts = await fileToGenerativePart(image.value);
      const resultData = await model.generateContent([
        SIMPLE_AI_PROMPT,
        imageParts,
      ]);

      const fullTextResponse = resultData.response.text().trim();
      console.log("Raw AI response:", fullTextResponse);

      if (fullTextResponse.includes("No human face detected")) {
        introductoryMessage.value = fullTextResponse;
        result.value = null;
        loading.value = false;
        return;
      }
      const jsonStartIndex = fullTextResponse.indexOf("{");
      const jsonEndIndex = fullTextResponse.lastIndexOf("}");
      if (
        jsonStartIndex !== -1 &&
        jsonEndIndex !== -1 &&
        jsonEndIndex > jsonStartIndex
      ) {
        introductoryMessage.value = fullTextResponse
          .substring(0, jsonStartIndex)
          .trim();
        let jsonString = fullTextResponse.substring(
          jsonStartIndex,
          jsonEndIndex + 1
        );
        jsonString = jsonString.replace(/```json|```/g, "").trim();

        let parsedJson;
        try {
          parsedJson = JSON.parse(jsonString);
          result.value = parsedJson;
          generateKeywords(JSON.stringify(result.value));
          await generateRelatedQuestions(JSON.stringify(result.value));

          // --- Pinia Store Logic to save data ---
          const newData: Omit<FaceData, "apiCalles"> = {
            shape: parsedJson.face_shape,
            img: imageParts.inlineData.data,
            gender:
              parsedJson.gender === "Male"
                ? 1
                : parsedJson.gender === "Female"
                ? 2
                : 0,
            ageCategory: parsedJson.age_group,
            email: userEmail,
            // Re-adding these fields with default values to satisfy the Omit type
            pd: "",
            frameWidth: "",
            lensHeight: "",
            bridge: "",
            recommendedFrames: "",
            recommendationSummary: "",
          };

          const success = identifiedFacesStore.updateOrAddFaceData(newData);
          if (success) {
            console.log("Successfully updated identifiedFaces store.");
          }
          // --- End Pinia Store Logic ---
        } catch (parseError) {
          console.error("Failed to parse JSON from AI response:", parseError);
          introductoryMessage.value =
            "An error occurred: Could not parse AI response. Please try again.";
          result.value = null;
        }
      } else {
        introductoryMessage.value =
          "Unexpected response format from AI. Please try again.";
        result.value = null;
      }
    } catch (err) {
      console.error(err);
      introductoryMessage.value = `An error occurred: ${
        err instanceof Error ? err.message : "Unknown error occurred"
      }`;
      result.value = null;
    } finally {
      loading.value = false;
      ok();
    }
  };
  return {
    identifyImage,
  };
};
