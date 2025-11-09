
import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private base64ToGenerativePart(base64: string, mimeType: string) {
    return {
      inlineData: {
        data: base64.split(',')[1],
        mimeType,
      },
    };
  }
  
  async generateReunifyPrompt(childhoodImg: string, currentImg: string, style: string): Promise<string> {
    const childhoodPart = this.base64ToGenerativePart(childhoodImg, 'image/jpeg');
    const currentPart = this.base64ToGenerativePart(currentImg, 'image/jpeg');

    const prompt = `Based on these two images, one of a person as a child and one as an adult, generate a detailed and vivid prompt for an AI image generator. The new image should artistically reunify the two life stages, capturing the spirit and journey of the person. The desired style is "${style}". Describe a scene, composition, colors, and mood. For example, for a 'friendly' style, you might describe a warm, sunny scene. For 'action', you might describe a dynamic, energetic composition. The generated prompt should be a single paragraph, rich in detail, ready to be used to create a beautiful and evocative image.`;

    const response: GenerateContentResponse = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [childhoodPart, currentPart, { text: prompt }] },
    });
    
    return response.text;
  }

  async generateEditPrompt(baseImage: string, editPrompt: string): Promise<string> {
    const imagePart = this.base64ToGenerativePart(baseImage, 'image/png');
    
    const prompt = `You are an AI assistant for image editing. You will receive an image and a text instruction for how to modify it. Your task is to generate a new, detailed prompt for an AI image generator that describes the original image but with the requested modification. The modification is: "${editPrompt}". Generate a single paragraph prompt describing the new scene, composition, colors, and mood in detail.`;

    const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] }
    });

    return response.text;
  }

  async generateImage(prompt: string): Promise<string> {
    const response = await this.ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error('Image generation failed to produce an image.');
    }
  }
}
