// utils/glassesFinder.ts

import type { Product } from "~/constants";

// Rules mapping
const rules: Record<
  string, // face shape
  Record<"male" | "female", string[]> // gender → allowed shapes
> = {
  Oval: {
    male: [
      "rectangle_male",
      "rectangle_unisex",
      "square_male",
      "square_male_sg",
      "square_unisex",
      "geometric_male",
      "geomatric_unisex",
      "round_male",
      "round_unisex",
      "semi_round_unisex",
      "semi_round_male",
    ],
    female: [
      "cateye_female",
      "rectangle_male",
      "rectangle_unisex",
      "hexa_female",
      "hexa_unisex",
      "round_female",
      "round_unisex",
      "geomatric_female",
      "geomatric_unisex",
    ],
  },

  Oblong: {
    male: [
      "rectangle_male",
      "rectangle_unisex",
      "square_male",
      "square_unisex",
      "geometric_male",
      "geomatric_unisex",
      "round_male",
      "round_unisex",
      "semi_round_unisex",
      "semi_round_male",
    ],
    female: [
      "cateye_female",
      "hexa_female",
      "hexa_unisex",
      "round_female",
      "round_unisex",
      "geomatric_female",
      "geomatric_unisex",
    ],
  },

  Round: {
    male: [
      "square_male",
      "square_unisex",
      "rectangle_male",
      "rectangle_unisex",
      "geomatric_male",
      "geomatric_unisex",
      "sg_square_male",
    ],
    female: [
      "square_female",
      "square_unisex",
      "geomatric_female",
      "geomatric_unisex",
      "rectangle_female",
      "rectangle_unisex",
      "cat_eye_female",
      "cat_eye_unisex",
      "hexa_female",
      "hexa_unisex",
    ],
  },

  Square: {
    male: [
      " _male",
      "round_male",
      "round_unisex",
      "oval_male",
      "oval_unisex",
      "aviator_male",
      "aviator_unisex",
      "geometric_male",
      "geomatric_unisex",
      "browline_male",
      "browline_unisex",
    ],
    female: [
      "browline_female",
      "browline_unisex",
      "round_female",
      "round_unisex",
      "oval_female",
      "cat_eye_female",
      "cat_eye_unisex",
      "oval_unisex",
    ],
  },

  Rectangle: {
    male: [
      "round_male",
      "round_unisex",
      "oval_male",
      "oval_unisex",
      "browline_male",
      "aviator_male",
      "aviator_unisex",
      "geometric_male",
      "geomatric_unisex",
    ],
    female: [
      "round_female",
      "round_unisex",
      "oval_female",
      "oval_unisex",
      "cat_eye_female",
      "browline_female",
    ],
  },

  Triangle: {
    male: [
      "browline_male",
      "oval_male",
      "oval_unisex",
      "aviator_male",
      "aviator_unisex",
      "round_male",
      "round_unisex",
      "rectangle_male",
      "rectangle_unisex",
    ],
    female: [
      "browline_female",
      "round_female",
      "round_unisex",
      "oval_female",
      "oval_unisex",
      "cat_eye_female",
    ],
  },
  Heart: {
    male: [
      "aviator_male",
      "round_male",
      "oval_male",
      "aviator_unisex",
      "round_unisex",
      "oval_unisex",
    ],
    female: [
      "cat_eye_female",
      "aviator_female",
      "oval_female",
      "cat_eye_unisex",
      "aviator_unisex",
      "oval_unisex",
    ],
  },
  Allsg: {
    male: [
      "rectangle_male_sg",
      "rectangle_unisex_sg",
      "square_male_sg",
      "square_male_sg_sg",
      "square_unisex_sg",
      "geometric_male_sg",
      "geomatric_unisex_sg",
      "round_male_sg",
      "round_unisex_sg",
      "semi_round_unisex_sg",
      "semi_round_male_sg",
    ],
    female: [
      "cateye_female_sg",
      "rectangle_female_sg",
      "rectangle_unisex_sg",
      "hexa_female_sg",
      "hexa_unisex_sg",
      "round_female_sg",
      "round_unisex_sg",
      "geomatric_female_sg",
      "geomatric_unisex_sg",
    ],
  },
  Kids: {
    male: [
      "oval_male_kids",
      "oval_unisex_kids",
      "rectangle_male_kids",
      "rectangle_unisex_kids",
      "square_male_kids",
      "square_male_sg_kids",
      "square_unisex_kids",
      "geometric_male_kids",
      "geomatric_unisex_kids",
      "round_male_kids",
      "round_unisex_kids",
      "semi_round_unisex_kids",
      "semi_round_male_kids",
    ],
    female: [
      "oval_female_kids",
      "oval_unisex_kids",
      "cateye_female_kids",
      "rectangle_male_kids",
      "rectangle_unisex_kids",
      "hexa_female_kids",
      "hexa_unisex_kids",
      "round_female_kids",
      "round_unisex_kids",
      "geomatric_female_kids",
      "geomatric_unisex_kids",
    ],
  },
};

// Finder function
export function glassesFinder(
  faceShapes: string | string[], // single or multiple shapes
  genders: "male" | "female" | ("male" | "female")[], // single or multiple genders
  products: Product[] | null
): Product[] {
  if (!products || products.length === 0) return [];

  // Normalize to arrays
  const shapesArray = Array.isArray(faceShapes) ? faceShapes : [faceShapes];
  const gendersArray = Array.isArray(genders) ? genders : [genders];

  // Collect allowed shapes from all given face shapes + genders
  const allowedShapes = shapesArray.reduce<string[]>((acc, shape) => {
    gendersArray.forEach((g) => {
      const gRules = rules[shape]?.[g] ?? [];
      acc.push(...gRules);
    });
    return acc;
  }, []);

  // console.log("Searching faceShapes:", shapesArray);
  // console.log("Allowed shapes:", allowedShapes);

  // If we found allowed shapes, filter products
  if (allowedShapes.length > 0) {
    return products.filter((p) => allowedShapes.includes(p.shape));
  }

  // If no rules matched, return all
  return products;
}
