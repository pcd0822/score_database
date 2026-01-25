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
      // Parse rubric with points
      let rubricText = '';
      if (typeof rubric === 'string' && rubric.startsWith('{')) {
        try {
          const rubricObj = JSON.parse(rubric);
          rubricText = Object.entries(rubricObj).map(([k, v]) => {
            if (typeof v === 'object' && v.points && v.criteria) {
              return `- ${k}점 (배점: ${v.points}점): ${v.criteria}`;
            } else {
              return `- ${k}점: ${v}`;
            }
          }).join('\n');
        } catch (e) {
          rubricText = rubric;
        }
      } else {
        rubricText = rubric;
      }

      prompt = `
        You are a strict but fair teacher grading a student's answer. You must carefully analyze the student's actual response and compare it against the rubric criteria.
        
        Question: ${question}
        Model Answer (Reference): ${correctAnswer}
        
        Rubric (Scoring Criteria with Points): 
        ${rubricText}
        
        Student's Actual Answer: "${studentAnswer}"
        
        IMPORTANT INSTRUCTIONS:
        1. You MUST carefully read and analyze the student's actual answer content first.
        2. Compare the student's answer against EACH rubric criterion, checking what the student actually wrote.
        3. Evaluate how well the student's answer addresses the question and meets the rubric criteria.
        4. Assign a score based on how well the student's answer matches the rubric criteria (not just the model answer).
        5. Provide specific feedback that:
           - References specific parts of the student's answer
           - Explains which rubric criteria were met or not met
           - Suggests concrete improvements based on what the student actually wrote
           - Points out strengths in the student's answer if any
        
        Your evaluation must be based on the STUDENT'S ACTUAL ANSWER CONTENT, not just comparing to the model answer.
        
        Output JSON format:
        {
          "score": number (must match one of the rubric point levels),
          "feedback": "string (detailed feedback referencing the student's answer)"
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
