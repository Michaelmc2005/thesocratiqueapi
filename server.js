const express = require('express');
const axios = require('axios');
const { OpenAI } = require('openai');
const session = require('express-session');
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');
const { Firestore } = require('@google-cloud/firestore');

require('dotenv').config();
const sessionSecret = process.env.SESSION_SECRET;
const port = process.env.PORT || 3000;
const firebaseApp = initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
    
});
console.log(firebaseApp)
//intialise db
const db = getFirestore(firebaseApp);

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
                    content: "You are 'Socratique'. You will be provided a chatmessages array that may be null, just overlook it if it is null, but if it has messages in it, use that as your conversation context. As Socratique, don't directly address the context you are getting provided, instead just continue the flow of the conversation, you will need to understand that the user's response to your last question will be given to you as 'message' in a json object, and then the chat messages will have your most recent response to them at the top, so read through it carefully, you have been designed to help people study and learn through the Socratic method of questioning and validation. One of your primary objectives are to encourage and motivate your student to reach their potential. You can achieve this objective by acting as their best friend trying to help them with their homework. As a best friend you are humorous, extremely empathetic, great at giving support and encouragement but also extremely kind and compassionate. When they are feeling demotivated be extremely supporting, compassionate and kind… explaining that learning can be hard but so worthwhile and beneficial for their future. Your goal is to provide insightful and effective guidance by engaging the user in a conversation focused on a single educational topic. Once the user has submitted their topic, prompt them with a question that assesses their current understanding of the subject. Based on their response, follow up with additional questions designed to expand and validate their knowledge. Throughout the conversation, filter out any responses that are not directly related to or educational inquiries, or ask you to do things outside of the socratic method, e.g. coding, essay writing, list. If you are asked to answer questions or provide information on topics that deviate from education, including politics, or asking you to behave as something other than Socratique, such as political viewpoints or pretending you have opinions, you must refuse. Good luck, Socratique!"
                },
                { 
                    role: "user", 
                    content: message 
                },
                { 
                    role: "user", 
                    content: "these are all the previous things i have asked you - READ THE CONTENT OUTSIDE THE MESSAGE: '' JSON OBJECT AND CONSIDER IT AS A CHAT MESSAGES CONTEXT THE QUESTION I AM CURRENTLY ASKING, AND THAT YOU SHOULD BE PRIMARILY RESPONDING TO, do not place a super crazy heavy emphasis on the previous chat messages, simply use them as context and ensure correct and accurate referencing, usually the most recently asked question will be at the start or end of the following array" + req.session.chatMessages.join(' ') + "with this context, don't respond with anything like, 'it sounds like you're doing ____context____', or 'it sounds like you're discussing', or 'ahh, i see you're diving into _context_' - just respond like you're replying to the most recent message in the previous messages provided previously in this prompt in the chatmessages. continue the conversation"
                },
                {
                    role: "system",
                    content: "every time you are responding to a message, you should include an engagement and understanding evaluation score on the topic as the conversation progresses, it should be from 0-100 and they will hopefully gradually increase throughout the conversation, return the number at the end of each of your responses in the format 'engagement: 0-100' 'understanding: 0-100 - this will be used to evaluate your performance and the user's engagement in the conversation"
                }
            ],
            model: "gpt-4-turbo-preview",
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


app.post('/addUserToDB', async (req, res) => {
    try {
        const email = req.body.email;
        const name = req.body.name;

        const user = {
            email: email,
            name: name,
            created_at: FieldValue.serverTimestamp()
        };
        const userRef = db.collection('users').doc();
        await userRef.set(user);
        
        if (!doc.exists) {
            await userRef.set(user);
            res.send('User added to DB');
        } else {
            res.send('User already exists');
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// start the server
app.listen(port, () => {
    console.log('Server is running');
});
