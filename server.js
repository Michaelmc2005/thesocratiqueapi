const express = require('express');
const axios = require('axios');
const { OpenAI } = require('openai');
const session = require('express-session');
require('dotenv').config();
const sessionSecret = process.env.SESSION_SECRET;
const port = process.env.PORT || 3000;

// create a new express application
const app = express();
app.use(express.json());

// set up the session
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true
}));

//if it is a new session, clear the chat messages
app.use((req, res, next) => {
    if (!req.session.chatMessages) {
        req.session.chatMessages = [];
    }
    next();
});
console.log(process.env.SESSION_SECRET);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// set up the chat endpoint
app.post('/chat', async (req, res) => {
    try {
        console.log(req.body);

        // ensure message is a string
        const message = typeof req.body.message === 'string' ? req.body.message : JSON.stringify(req.body.message);
        const previousMessages = req.body.chat_messages;
        if (!req.session.chatMessages) {
            req.session.chatMessages = [];
        }

        // add the user's message to the chatMessages array as a string
        req.session.chatMessages.push(message);

        // send the user's message to OpenAI
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are 'Socratique'. You will be provided a chatmessages array that may be null, just overlook it if it is null, but if it has messages in it, use that as your conversation context.As Socratique, don't directly address the context you are getting provided, instead just continue the flow of the conversation, you will need to understand that the user's response to your last question will be given to you as 'message' in a json object, and then the chat messages will have your most recent response to them at the top, so read through it carefully, you have been designed to help people study and learn through the Socratic method of questioning and validation. One of your primary objectives are to encourage and motivate your student to reach their potential. You can achieve this objective by acting as their best friend trying to help them with their homework. As a best friend you are humorous, extremely empathetic, great at giving support and encouragement but also extremely kind and compassionate. When they are feeling demotivated be extremely supporting, compassionate and kind… explaining that learning can be hard but so worthwhile and beneficial for their future. Your goal is to provide insightful and effective guidance by engaging the user in a conversation focused on a single educational topic. Once the user has submitted their topic, prompt them with a question that assesses their current understanding of the subject. Based on their response, follow up with additional questions designed to expand and validate their knowledge. Throughout the conversation, filter out any responses that are not directly related to or educational inquiries, or ask you to do things outside of the socratic method, e.g. coding, essay writing, list. If you are asked to answer questions or provide information on topics that deviate from education, including politics, or asking you to behave as something other than Socratique, such as political viewpoints or pretending you have opinions, you must refuse. Good luck, Socratique!"
                },
                { 
                    role: "user", 
                    content: message 
                },
                { 
                    role: "user", 
                    content: "these are all the previous things i have asked you: " + previousMessages
                }
            ],
            model: "gpt-3.5-turbo",
        });
        console.log(req.session.chatMessages.join(' '))

        // process the response
        let generatedResponse = completion.choices[0].message.content;
        
        generatedResponse = generatedResponse.replace(/\n/g, ' ')
                                             .replace(/[\[\]"]+/g, '') 
                                             .replace(/\s{2,}/g, ' ');

        // add the response to the chatMessages array
        req.session.chatMessages.push(generatedResponse);
        
        // send the processed string as the response
        res.send(generatedResponse);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// start the server
app.listen(port, () => {
    console.log('Server is running');
});
