import html
from flask import Flask, render_template, request, jsonify
import openai
import json
import re

app = Flask(__name__)

# Set up OpenAI API key
openai.api_key = "Your OpenAI API Key"
post_prompt = "Do not give any information about anything that is not mentioned in the PROVIDED CONTEXT."

# Load prompt and model data
with open("prompt.txt", "r", encoding="utf-8") as file:
    prompt = file.read()
with open("model.txt", "r", encoding="utf-8") as file:
    gptModel = file.read()
# Define JSON data for customer information and coverage plans
with open("YourFile.txt", "r", encoding="utf-8") as file:
    YourFile = file.read()
# Initialize conversation history with provided messages
conversation_history = [
    {"role": "system", "content": prompt},
]

YourFile = json.dumps(YourFile)


@app.route("/")
def index():
    global conversation_history
    conversation_history = conversation_history[:4]
    print(len(conversation_history))
    return render_template("index.html", conversation_history=conversation_history)


@app.route("/clear-conversation", methods=["POST"])
def clear_conversation():
    global conversation_history

    print("before clearing the conversation history")
    # print(conversation_history)
    # Clear conversation history
    conversation_history = []
    # print(conversation_history)

    # Initialize conversation history with provided messages
    conversation_history = [
        {
            "role": "system",
            "content": prompt + f"YourFile data" + YourFile,
        },
        {
            "role": "system",
            "content": "Do not give any information about anything that is not mentioned in the PROVIDED CONTEXT.",
        },
    ]
    # Return success message
    return jsonify({"message": "Conversation history cleared successfully."})


conversation_history = [
    {
        "role": "system",
        "content": prompt,
    },
    {
        "role": "system",
        "content": prompt + f"YourFile data " + YourFile,
    },
    {
        "role": "system",
        "content": "Do not give any information about anything that is not mentioned in the PROVIDED CONTEXT.",
    },
]


@app.route("/chat", methods=["POST"])
def chat():
    global conversation_history
    global suggested_questions_list

    user_question = request.form["message"]
    conversation_history.append({"role": "user", "content": user_question})

    # # Check if the user's message is a greeting
    # greetings = ["hi", "hello"]
    # if user_question.lower() in greetings:
    #     response = (
    #         "Hello! I'm the Jacaranda Smiles Virtual Assistant and I'm here to help you."
    #     )
    # else:
    #     response = chatbot(user_question)

    # questions = ""
    # print("----------RESPONSE---------")
    # print(response)
    response = chatbot(user_question)

    # Check for suggested questions and append them to the response
    if "QUESTIONS" in response:
        response, questions = response.split("QUESTIONS", 1)

    else:
        response = response
        questions = ""

    response = response.strip()
    suggested_questions_list = [
        re.sub(r"^\d+\.\s*", "", question)
        for question in questions.split("\n")
        if question
    ]

    conversation_history.append({"role": "assistant", "content": response})

    # pattern = r'\*\*'
    pattern = r"\*\*"
    pattern2 = r"###"

    # Replace occurrences of ** along with surrounding text with an empty string
    response_without_double_asterisks = re.sub(pattern, "", response)

    # Replace occurrences of ### with an empty string
    response_without_triple_hashes = re.sub(
        pattern2, "", response_without_double_asterisks
    )

    # Replace remaining single asterisks with their HTML entity
    response_with_line_breaks = (
        html.escape(response_without_triple_hashes)
        .replace("\n", "<br>")
        .replace("*", "&#42;")
    )

    return jsonify({"response": response_with_line_breaks})


# Add a new route to handle suggested questions requests
@app.route("/suggested-questions")
def suggested_questions():
    global suggested_questions_list
    questions = suggested_questions_list
    suggested_questions_list = []  # Clear suggested_questions_list after sending
    return jsonify({"questions": questions})


def chatbot(question):
    global conversation_history

    # Provide conversation history to the chatbot
    messages = conversation_history.copy()
    messages.append({"role": "user", "content": post_prompt})

    # Use OpenAI's Chat API to generate a response based on conversation history
    response = openai.ChatCompletion.create(model=gptModel, messages=messages,seed=5)

    # Get the response from the chatbot
    chatbot_response = response["choices"][0]["message"]["content"]

    return chatbot_response


if __name__ == "__main__":
    app.run(debug=True)
