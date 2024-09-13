const express = require("express");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const jokes = require("daddy-jokes");
const cron = require("node-cron");
const {addData,getMails}=require("./db");


// Creating a Transporter
const oauth = async () => {
    try {
        console.log("Starting OAuth process");
        const oauth2Client = new OAuth2Client(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            "https://developers.google.com/oauthplayground/"
        );
        oauth2Client.setCredentials({
            refresh_token: process.env.REFRESH_TOKEN,
        });
        const accessToken = await oauth2Client.getAccessToken();
        console.log("Access token obtained");
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.FROM_MAIL,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: accessToken.token,
            },
        });
        console.log("Transporter created");
        return transporter;
    } catch (error) {
        console.error("Error in oauth function:", error);
        throw error;
    }
};

// Creating mailOptions
const mailBody = async (to, subject) => {
    try {
        console.log("Starting mailBody function");
        const template = handlebars.compile("{{joke}}");
        const joke = jokes();
        console.log("Generated joke:", joke);
        const context = { joke };
        const output = template(context);
        const mailOptions = {
            from: process.env.FROM_MAIL,
            to: to,
            subject: subject,
            html: output,
        };
        return mailOptions;
    } catch (error) {
        console.error("Error in mailBody function:", error);
        throw error;
    }
};

const app = express();
app.use(express.json());

//  scheduleMail function
const scheduleMail = async (to, subject) => {
    const mailOptions = await mailBody(to, subject);
    console.log(`Scheduling mail for ${to}`);
    
    cron.schedule("00 18 * * *", async () => {
        console.log("Cron job triggered");
        try {
            const emailTransporter = await oauth();
            if (emailTransporter) {
                await emailTransporter.sendMail(mailOptions);
                console.log("Email sent successfully!");
            } else {
                console.error("Email transporter not initialized.");
            }
        } catch (error) {
            console.error("Error sending email:", error);
        }
    });
};


// Function invoking
// (async () => {
//     try {
//         const to = await getAllMails(); 
//         const recipientMails=to.map(email=>email.email);
//         if (recipientMails.length === 0) {
//             console.error("No recipients to send emails to.");
//             return;
//         }
//         const subject = "Joke of the day"; 
//         for(const email of recipientEmails){
//             await scheduleMail(email,subject);
//         }
//         // const subject = "Joke of the day"; 
//         console.log(`Scheduling email to ${to} with subject: ${subject}`);
//         await scheduleMail(to, subject);
//     } catch (error) {
//         console.error("Error in the self-invoking function:", error);
//     }
// })();




app.post("/email",addData);
app.get("/emails",getMails);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
