const   fs = require('fs'),
        express = require('express'),
        app = express(),
        mongoose = require("mongoose"),
        execSync = require("child_process").execSync;
        path = require('path'),
        passport = require("passport"),
        users = require("./models/users"),
        bodyParser = require("body-parser"),
        multerConfig = require("./multer-config"),
        bcrypt = require("bcrypt"),
        initializePassport = require("./passport-config.js"),
        session = require('express-session'),
        mongoStore = require('connect-mongo'),
        methodOverride = require('method-override');



app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.set('trust proxy', true);

app.use(session({
    store: mongoStore.create({
        mongoUrl: "mongodb://127.0.0.1:27017/study-service",
        ttl: 60 * 60 * 24 * 1
    }),
    secret: 'SECRET_WORD',
    resave: false,
    saveUninitialized: false,
    httpOnly: true,
    secure: true
    // cookie: {maxAge: 1000 * 60 * 60 * 24 * 1}
}));

app.use(passport.initialize());
app.use(passport.session());
initializePassport(
    passport,
    email => users.findOne({email: email}),
    id => users.findOne({_id: id}),
);

app.use(methodOverride('_method'));



/* SERVER START */

async function start() {
    try {
        console.log('CONNECTING TO DATABASE...');

        const OS = process.platform;

        switch (OS) {
            case 'win32':
                try {
                    execSync('net start mongodb', { stdio : 'pipe' });
                } catch {}
                break;

            case "linux":
                try {
                    execSync('systemctl start mongod', { stdio : 'pipe' });
                } catch {}
                break;
        }

        mongoose.set('strictQuery', false);
        await mongoose.connect(`mongodb://127.0.0.1:27017/study-service`, {
            autoIndex: false,
            useNewUrlParser: true,
            useUnifiedTopology: true
        }).then(() => {
            console.log('SUCCESSFUL CONNECTION TO DB!');
            app.listen(3011, () => {
                console.log('SERVER STARTED.')
            });
        });

    } catch (e) {
        console.log(e);
    }
}

start();

/* ////////////// */



app.get('/', (req, res) => {
    res.json({ good: true });
});

app.post('/login', (req, res) => {

})