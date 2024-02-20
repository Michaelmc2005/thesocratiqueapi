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
console.log(process.env.SESSION_SECRET);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// set up the chat endpoint
app.post('/chat', async (req, res) => {
    try {
        console.log(req.body);

        // ensure message is a string
        const message = typeof req.body.message === 'string' ? req.body.message : JSON.stringify(req.body.message);

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
                    content: "You are 'Socratique' ... [rest of the system message]"
                },
                { 
                    role: "user", 
                    content: message 
                },
                { 
                    role: "user", 
                    content: "these are all the previous things i have asked you: " + req.session.chatMessages.join(' ')
                }
            ],
            model: "gpt-3.5-turbo",
        });

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
