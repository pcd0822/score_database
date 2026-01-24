const { OpenAI } = require("openai");

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { question, studentAnswer, rubric, correctAnswer, type } = JSON.parse(event.body);

  if (!process.env.OPENAI_API_KEY) {
    return { statusCode: 500, body: "Missing OpenAI API Key" };
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    let prompt = "";
    
    if (type === 'essay') {
      prompt = `
        You are a strict but fair teacher grading a student's answer.
        
        Question: ${question}
        Correct Answer (Model Answer): ${correctAnswer}
        Rubric (Scoring Criteria): ${rubric}
        
        Student Answer: "${studentAnswer}"
        
        Task:
        1. Evaluate the student's answer based on the rubric and model answer.
        2. Assign a score based on the 5-point scale defined in the rubric.
        3. Provide constructive feedback explaining the score and how to improve.
        
        Output JSON format:
        {
          "score": number,
          "feedback": "string"
        }
      `;
    } else {
      // Fallback for logic if needed server-side, though usually frontend handles exact matches
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Simple types should be graded locally or via strict match." }),
      };
    }

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: "You are a helpful grading assistant." }, { role: "user", content: prompt }],
      model: "gpt-4o-mini", // Cost effective model
      response_format: { type: "json_object" },
    });

    const result = completion.choices[0].message.content;

    return {
      statusCode: 200,
      body: result,
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to grade assignment" }),
    };
  }
};
