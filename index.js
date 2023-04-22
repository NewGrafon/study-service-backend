/* ////////////////////////// */
/* ИМПОРТЫ И ИХ ИНИЦИАЛИЗАЦИЯ */
/* ////////////////////////// */

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





/* ////////////////////////// */
/* НАСТРОЙКА И ЗАПУСК СЕРВЕРА */
/* ////////////////////////// */

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





/* /////// */
/* ЗАПРОСЫ */
/* /////// */

app.get('/', (req, res) => {
    res.json({ good: true });
});

app.post('/login', checkNotAuthenticated,
    passport.authenticate("local"),
    (req, res) => {
        if (req.isAuthenticated()) {
            res.json({
                result: true
            });
        } else {
            res.json({
                result: false
            });
        }
    });

app.post('/registration', checkNotAuthenticated, async (req, res) => {
    try {
       if (users.findOne({ email: req.body.email }))  {
           return res.json({
               exist: true,
               result: false
           });
       } else {
           const HashedPassword = await bcrypt.hash(req.body.password, 12);
           await new users({
               firstname: req.body.firstname,
               middlename: req.body.middlename,
               lastname: req.body.lastname,
               email: req.body.email,
               password: HashedPassword,
               accountType: 0,
               created: Date.now()
           }).save();

           return res.json({
               exist: false,
               result: true
           });
       }
    } catch (e) {
        return res.json({
            exist: false,
            result: false
        });
    }
});





/* /////// */
/* ФУНКЦИИ */
/* /////// */

async function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.json({
            error: 'Пользователь уже авторизован.'
        });
    }

    next();
}

async function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    res.json({
        error: 'Пользователь не авторизован.'
    });
}

async function getUser(req, res) {
    const user = {
        logged: req.isAuthenticated(),
        firstname: null,
        middlename: null,
        lastname: null,
        email: null,
        accountType: null,
        created: null,
    };
    try {
        if (user.logged) {
            await req.user.clone()
                .then((data) => {
                    user.firstname = data.firstname;
                    user.middlename = data.middlename;
                    user.lastname = data.lastname;
                    user.email = data.email;
                    user.accountType = data.accountType;
                    user.created = data.created;
                });
        }
    } catch (e) {
        console.error(e);
    }

    return user;
}

async function checkRepetitor(req, res, next) {
    await checkPrivilege(req, res, next, 1, true);
}

async function checkModerator(req, res, next) {
    await checkPrivilege(req, res, next, 2, false);
}

async function checkAdmin(req, res, next) {
    await checkPrivilege(req, res, next, 3, false);
}

async function checkPrivilege(req, res, next, requiredAccountType, onlyEqual = false) {
    try {
        const user = await getUser(req, res);
        const comparedAccType = onlyEqual
            ? user.accountType === requiredAccountType
            : user.accountType >= requiredAccountType;

        if (user.logged && comparedAccType) {
            return next();
        } else {
            return res.json({
                error: 'Недостаточно прав доступа.'
            });
        }
    } catch (e) {
        console.error(e);
    }
}