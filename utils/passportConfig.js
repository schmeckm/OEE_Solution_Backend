const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const axios = require('axios');
const session = require('express-session');
const dotenv = require("dotenv");

dotenv.config();

function initializePassport(app) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
    }, async(accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;

            let user;

            try {
                // API request to get user
                const response = await axios.get(`${process.env.OEE_API_URL}/users/email/${email}`);
                user = response.data; // User found
                console.log('User found:', user);
            } catch (error) {
                if (error.response && (error.response.status === 404 || error.response.status === 400)) {
                    // User not found, create a new user
                    console.log('User not found, creating a new user.');
                    const newUser = {
                        username: profile.displayName,
                        email: email,
                        role: 'user',
                        profilePicture: (profile.photos && profile.photos.length > 0) ? profile.photos[0].value : null,
                    };

                    console.log('Creating new user:', newUser);
                    const createdUserResponse = await axios.post(`${process.env.OEE_API_URL}/users`, newUser);
                    console.log('Created user response:', createdUserResponse.data);
                    user = createdUserResponse.data; // Use the newly created user
                } else {
                    // Handle other errors
                    console.error('Error fetching user:', error.message);
                    return done(error, null);
                }
            }

            // Update the profile picture if not already set and available
            if (user && !user.profilePicture && profile.photos && profile.photos.length > 0) {
                user.profilePicture = profile.photos[0].value;
            }

            console.log('Returning user object:', user);

            // Return the user object (including profile picture)
            return done(null, user);
        } catch (err) {
            console.error('Error during API request for email:', err.message);
            return done(err, null);
        }
    }));

    // Add session middleware
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your_secret_key',
        resave: false,
        saveUninitialized: true,
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // Serialize user into the session
    passport.serializeUser((user, done) => {
        done(null, { id: user.id, profilePicture: user.profilePicture });
    });

    // Deserialize user from the session
    passport.deserializeUser(async(sessionData, done) => {
        try {
            const response = await axios.get(`${process.env.OEE_API_URL}/users/${sessionData.id}`);
            const user = response.data;
            user.profilePicture = sessionData.profilePicture; // Attach profile picture from session
            done(null, user);
        } catch (err) {
            console.error('Error deserializing user:', err.message);
            done(err, null);
        }
    });
}

module.exports = initializePassport;