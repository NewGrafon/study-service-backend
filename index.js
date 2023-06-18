/* ////////////////////////// */
/* ИМПОРТЫ И ИХ ИНИЦИАЛИЗАЦИЯ */
/* ////////////////////////// */

const fs = require('fs'),
    express = require('express'),
    app = express(),
    mongoose = require("mongoose"),
    execSync = require("child_process").execSync,
    path = require('path'),
    passport = require("passport"),
    users = require("./models/users"),
    teachersRequests = require("./models/teachers-requests"),
    teachersConfig = require("./teachers-config.js").config,
    bodyParser = require("body-parser"),
    bcrypt = require("bcrypt"),
    initializePassport = require("./passport-config.js"),
    session = require('express-session'),
    mongoStore = require('connect-mongo'),
    methodOverride = require('method-override'),
    frontendIP = process.env.FRONTEND_IP || 'localhost',
    MongoServerIP = process.env.MONGO_SERVER_IP || '127.0.0.1',
    MongoURL = `mongodb://${MongoServerIP}:27017/study-service`;


app.use(express.json({ limit: 16000000 }));
app.use(bodyParser.urlencoded({extended: true, limit: 16000000}));

app.use(express.static(path.join(__dirname, 'public')));

app.set('trust proxy', true);

app.use(session({
    store: mongoStore.create({
        mongoUrl: MongoURL,
        ttl: 60 * 60 * 24 * 1
    }),
    secret: process.env.SECRET_WORD || 'SECRET_WORD',
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
                    execSync('net start mongodb', { stdio: 'pipe' });
                } catch {
                }
                break;

            // case "linux":
            //     try {
            //         execSync('systemctl restart mongod', { stdio : 'pipe' });
            //     } catch {}
            //     break;
        }

        mongoose.set('strictQuery', false);
        await mongoose.connect(MongoURL, {
            autoIndex: false,
            useNewUrlParser: true,
            useUnifiedTopology: true
        }).then(() => {
            console.log('SUCCESSFUL CONNECTION TO DB!');
            app.listen(3011);
        });

    } catch (e) {
        console.log(e);
    }
}

start()
    .then(() => {
        console.log('SERVER STARTED.');
    })
    .catch((e) => {
        throw new Error(e);
    });


/* /////// */
/* ЗАПРОСЫ */
/* /////// */

app.get('/', (req, res) => {
    res.json({good: true});
});


app.post('/login', checkNotAuthenticated,
    passport.authenticate("local", {
        successRedirect: '/api/is_authenticated',
        failureRedirect: '/api/is_authenticated',
    }));

app.post('/registration', checkNotAuthenticated, async (req, res) => {
    await RequestTryCatch(req, res, async () => {
        const body = await req.body;
        if (await users.findOne({email: body.email})) {
            return res.json({
                exist: true,
                result: false
            });
        } else {
            let hashedPassword = await bcrypt.hashSync(body.password, 12);

            const user = await new users({
                firstname: body.firstname,
                lastname: body.lastname,
                email: body.email,
                password: hashedPassword,
                accountType: 0,
                created: Date.now()
            });

            await user.save();

            return res.json({
                exist: false,
                result: true
            });
        }
    });
});

app.delete('/logout', checkAuthenticated, async (req, res) => {
    await RequestTryCatch(req, res, async () => {
        await req.logOut(() => {});
        res.json({result: true});
    })
});

app.get('/is_authenticated', (req, res) => {
    res.json({ result: req.isAuthenticated() });
});

app.get('/get_account_info', checkAuthenticated, async (req, res) => {
    await RequestTryCatch(req, res, async () => {
        return res.json(await getUser(req, res));
    });
});

app.get('/get_profile_picture', checkAuthenticated, async (req, res) => {
   await RequestTryCatch(req, res, async () => {
      const user = await getUser(req, res);
      const image = (await users.findOne({ email: user.email }, { image: 1 })).image;
       if (image.buffer !== undefined) {
           return res.json({
               result: true,
               image: image
           });
       } else {
           return res.json({
               result: false,
               image: null
           });
       }
   });
});

app.post('/change_profile_picture', checkAuthenticated, async (req, res) => {
    await RequestTryCatch(req, res, async () => {
        const user = await getUser(req, res);
        const image = req.body ?? null;
        if (image !== null && typeof image.mimetype !== undefined && typeof image.buffer !== undefined) {
            users.findOneAndUpdate({ email: user.email }, {
                image: {
                    mimetype: image.mimetype,
                    buffer: image.buffer
                }
            })
                .then(() => {
                    return res.json({
                        result: true,
                        error: null
                    });
                })
                .catch(() => {
                    return res.json({
                        result: false,
                        error: 'Произошла неизвестная ошибка!'
                    });
                });
        } else {
            return res.json({
                result: false,
                error: 'Изображение не соответствует требованиям!'
            });
        }
    });
});

app.get('/get_teachers', async (req, res) => {
    await RequestTryCatch(req, res, async () => {
        const teachers = await users
            .find({
                accountType: 1
            }, {
                _id: 1,
                firstname: 1,
                lastname: 1,
                teacherInfo: 1
            });

        return res.json(teachers);
    })
});

app.get('/get_account_picture_buffer/:id', async (req, res) => {
    await RequestTryCatch(req, res, async () => {
        const image = (await users.findOne({ _id: req.params.id }, { image: 1 }))?.image;
        if (image?.buffer !== undefined) {
            res.json({
                result: true,
                buffer: image.buffer
            });
        } else {
            res.json({
                result: false,
                error: 'Изображение отсутствует!'
            });
        }
    });
});

app.post('/teacher_send_form', checkAuthenticated, async (req, res) => {
    await RequestTryCatch(req, res, async () => {
        const body = req.body;
        const session = await req.user;

        const exist = await teachersRequests.findOne({'creator._id': session._id});
        if (!exist) {
            const newForm = new teachersRequests({
                creator: {
                    _id: session._id,
                    firstname: session.firstname,
                    lastname: session.lastname
                },
                requestInfo: {
                    education: body.education,
                    educationPlace: body.educationPlace,
                    workExperience: body.workExperience,
                    aboutMe: body.aboutMe,
                    canEducatePeoples: body.canEducatePeoples,
                    studyWays: body.studyWays
                }
            });

            newForm.save()
                .then(() => {
                    res.json({ result: true });
                })
                .catch(() => {
                    res.json({ result: false, error: 'Произошла неизвестная ошибка.' });
                });
        } else {
            res.json({ result: false, error: 'От этого пользователя уже отправлена форма.' });
        }
    });
});

app.get('/get_new_teachers', checkModerator, async (req, res) => {
   await RequestTryCatch(req, res, async () => {
       const requests = await teachersRequests.find();
       res.json(requests);
   })
});

app.get('/get_wanna_edit_teachers', checkModerator, async (req, res) => {
    await RequestTryCatch(req, res, async () => {
        // const requests = await teachersRequests.find();
        res.json([]);
    })
});

app.post('/accept_teacher_request', checkModerator, async (req, res) => {
    await RequestTryCatch(req, res, async () => {
        const _id = req.body._id;
        const requestForm = await teachersRequests.findOne({ 'creator._id': _id });
        users.updateOne({ _id: _id }, {
            accountType: 1,
            teacherInfo: requestForm.requestInfo
        })
            .then(() => {
                res.json({ result: true });
            })
            .catch(() => {
                res.json({ result: false, error: 'Произошла неизвестная ошибка.' });
            });
    });
});

app.post('/reject_teacher_request', checkModerator, async (req, res) => {
    await RequestTryCatch(req, res, async () => {
        const _id = req.body._id;
        await teachersRequests.deleteOne({ 'creator._id': _id })
            .then(() => {
                res.json({ result: true });
            })
            .catch(() => {
                res.json({ result: false, error: 'Произошла неизвестная ошибка.' });
            });
    });
});

/* /////// */
/* ФУНКЦИИ */
/* /////// */

async function RequestTryCatch(req, res, cb = async () => {
}) {
    try {
        await cb();
    } catch (e) {
        console.error(e);
        return res.json({error: 'Произошла ошибка при выполнении запроса.'});
    }
}

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