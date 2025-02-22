// import { db } from "@/db";
// import { videos } from "@/db/schema";
// import { serve } from "@upstash/workflow/nextjs";
// import { and, eq } from "drizzle-orm";

// interface InputType {
//   userId: string;
//   videoId: string;
// }



// // erb menq sksecinq opan ai-i hatvacy, menq avelacrecinq sa 

// const TITLE_SYSTEM_PROMPT = `Your task is to generate an SEO-focused title for a YouTube video based on its transcript. Please follow these guidelines:
// - Be concise but descriptive, using relevant keywords to improve discoverability.
// - Highlight the most compelling or unique aspect of the video content.
// - Avoid jargon or overly complex language unless it directly supports searchability.
// - Use action-oriented phrasing or clear value propositions where applicable.
// - Ensure the title is 3-8 words long and no more than 100 characters.
// - ONLY return the title as plain text. Do not add quotes or any additional formatting.`;

// export const { POST } = serve(async (context) => {
//   const input = context.requestPayload as InputType;
//   const { videoId, userId } = input;

//   const video = await context.run("get-video", async () => {
//     const [existingVideo] = await db
//       .select()
//       .from(videos)
//       .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

//     if (!existingVideo) {
//       throw new Error("Not found");
//     }

//     return existingVideo;
//   });


//   // enb menq sksecinq open ai-i hatvacy, menq avelacrecinq sa

//   const { body } = await context.api.openai.call("generate-title", {
//     token: process.env.GEMINI_API_KEY!,
//     operation: "chat.completions.create",
//     body: {
//       model: "gpt-4o",
//       messages: [
//         {
//           role: "system",
//           content: TITLE_SYSTEM_PROMPT,
//         },
//         {
//           role: "user",
//           content:
//             "Hi everyone, in this tutorial we will be building a youtube clone",
//         },
//       ],
//     },
//   });

//   const title = body.choices[0]?.message.content;


//   // minchev stex


//   // stex poxecinq title: -i hatvacy

//   await context.run("update-video", async () => {
//     await db
//       .update(videos)
//       .set({
//         title: title || video.title,
//       })
//       .where(and(eq(videos.id, video.id), eq(videos.userId, video.userId)));
//   });
// });



// chat gbt

// import { db } from "@/db";
// import { videos } from "@/db/schema";
// import { serve } from "@upstash/workflow/nextjs";
// import { and, eq } from "drizzle-orm";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// interface InputType {
//   userId: string;
//   videoId: string;
// }

// const TITLE_SYSTEM_PROMPT = `Your task is to generate an SEO-focused title for a YouTube video based on its transcript. Please follow these guidelines:
// - Be concise but descriptive, using relevant keywords to improve discoverability.
// - Highlight the most compelling or unique aspect of the video content.
// - Avoid jargon or overly complex language unless it directly supports searchability.
// - Use action-oriented phrasing or clear value propositions where applicable.
// - Ensure the title is 3-8 words long and no more than 100 characters.
// - ONLY return the title as plain text. Do not add quotes or any additional formatting.`;

// // Initialize Gemini AI client
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// export const { POST } = serve(async (context) => {
//   const input = context.requestPayload as InputType;
//   const { videoId, userId } = input;

//   const video = await context.run("get-video", async () => {
//     const [existingVideo] = await db
//       .select()
//       .from(videos)
//       .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

//     if (!existingVideo) {
//       throw new Error("Not found");
//     }

//     return existingVideo;
//   });

//   // Call Gemini AI to generate a title
//   const model = genAI.getGenerativeModel({ model: "gemini-pro" });

//   const result = await model.generateContent({
//     contents: [
//       { role: "user", parts: [{ text: TITLE_SYSTEM_PROMPT }] },
//       { role: "user", parts: [{ text: video.transcript || "No transcript available." }] },
//     ],
//   });

//   const response = await result.response;
//   const title = response.text()?.trim() || video.title; // Default to existing title if empty

//   await context.run("update-video", async () => {
//     await db
//       .update(videos)
//       .set({ title })
//       .where(and(eq(videos.id, video.id), eq(videos.userId, video.userId)));
//   });
// });


// chat gbt adding something fot track

import { db } from "@/db";
import { videos } from "@/db/schema";
import { serve } from "@upstash/workflow/nextjs";
import { and, eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface InputType {
  userId: string;
  videoId: string;
}

const TITLE_SYSTEM_PROMPT = `Your task is to generate an SEO-focused title for a YouTube video based on its transcript. Please follow these guidelines:
- Be concise but descriptive, using relevant keywords to improve discoverability.
- Highlight the most compelling or unique aspect of the video content.
- Avoid jargon or overly complex language unless it directly supports searchability.
- Use action-oriented phrasing or clear value propositions where applicable.
- Ensure the title is 3-8 words long and no more than 100 characters.
- ONLY return the title as plain text. Do not add quotes or any additional formatting.`;

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const { POST } = serve(async (context) => {
  const input = context.requestPayload as InputType;
  const { videoId, userId } = input;

  const video = await context.run("get-video", async () => {
    const [existingVideo] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

    if (!existingVideo) {
      throw new Error("Not found");
    }

    return existingVideo;
  });

  // Fetch transcript from Mux
  const transcript = await context.run("get-transcript", async () => {
    const trackUrl = `https://stream.mux.com/${video.muxPlaybackId}/text/${video.muxTrackId}.txt`;
    const response = await fetch(trackUrl);

    if (!response.ok) {
      throw new Error("Failed to fetch transcript");
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new Error("Bad Request: Transcript is empty");
    }

    return text;
  });

  // Call Gemini AI to generate a title
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  let title = video.title; // Default to existing title if API call fails
  let status = "success"; // Track request status

  try {
    const result = await model.generateContent([
      { text: TITLE_SYSTEM_PROMPT },
      { text: transcript }, // Use fetched transcript
    ]);

    const response = await result.response;
    title = response.text().trim() || video.title;
  } catch (error) {
    console.error("Gemini API error:", error);
    status = "failed"; // Mark request as failed if error occurs
  }

  await context.run("update-video", async () => {
    await db
      .update(videos)
      .set({ title, status }) // Save status to track if request was successful or failed
      .where(and(eq(videos.id, video.id), eq(videos.userId, video.userId)));
  });

  return { title, status }; // Return status for tracking
});
