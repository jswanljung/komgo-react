import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import Linkify from "linkifyjs/react";
document.addEventListener("DOMContentLoaded", function() {
    var fetchurl = "/kommentarer" + document.location.pathname;
    var comments = [];
    var isLoggedIn = false;
    var lastID; // eslint-disable-line
    var user;

    function addComments(more) {
        more.forEach(c => {
            if (c.parent > 0) {
                for (var i = 0; i < comments.length; i++) {
                    if (comments[i].id == c.parent) {
                        if ("children" in comments[i] && comments[i].children) {
                            comments[i].children.push(c);
                        } else {
                            comments[i].children = [c];
                        }
                        break;
                    }
                }
            } else {
                comments.push(c);
            }
        });
    }

    function sweDate(datestring) {
        var d = new Date(Date.UTC(...datestring.split(/[-T:Z]/, 6)));
        var options = {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "numeric"
        };
        return new Intl.DateTimeFormat("sv-SE", options).format(d);
    }

    function Comments(props) {
        if (props.comments) {
            var clist = props.comments.map(comment => (
                <Comment comment={comment} key={comment.id} />
            ));
            return <section className="com__list">{clist}</section>;
        }
        return null;
    }

    function Comment(props) {
        return (
            <article className="com">
                <section className="com__frame">
                    <div className="com__time">
                        {sweDate(props.comment.created)}
                    </div>
                    <div className="com__author">
                        {props.comment.screenname}
                    </div>
                    <Linkify tagName="section" className="com__content">
                        {props.comment.content}
                    </Linkify>
                </section>
                <Replies comments={props.comment.children} />
                <ReplyForm parent={props.comment.id} />
            </article>
        );
    }

    function ReplyForm(props) {
        const [formOpen, setFormOpen] = useState(false);
        const [value, setValue] = useState("");

        if (!isLoggedIn) return null;

        function handleChange(event) {
            setValue(event.target.value);
        }

        function handleSubmit(e) {
            let vals = { content: value, parent: props.parent, lastid: lastID };
            sendRequest("newcomment", vals, () => {
                setFormOpen(false);
                setValue("");
            });
            e.preventDefault();
        }

        return (
            <form className="com__form isHidden" onSubmit={handleSubmit}>
                {formOpen ? (
                    <React.Fragment>
                        <ExpandingTextArea
                            placeholder="Skriv ett svar"
                            onChange={handleChange}
                            value={value}
                        />
                        <button className="com__button" disabled={value.trim()==""}> Skicka svar </button>{" "}
                    </React.Fragment>
                ) : (
                    <button
                        className="com__replybutton"
                        onClick={() => setFormOpen(true)}
                    >
                        Svara
                    </button>
                )}
            </form>
        );
    }

    function ExpandingTextArea(props) {
        const textAreaRef = useRef(null);
        useEffect(() => {
            if (textAreaRef.current) textAreaRef.current.focus();
        }, []);

        return (
            <div className="com__textarea-wrapper">
                <pre>
                    <span>{props.value}</span>
                    <br />
                </pre>
                <textarea
                    className="com__textarea"
                    name="content"
                    placeholder={props.placeholder}
                    ref={textAreaRef}
                    required
                    minLength="1"
                    maxLength="3000"
                    onChange={e => {
                        props.onChange(e);
                    }}
                    value={props.value}
                />
            </div>
        );
    }

    function Replies(props) {
        if (props.comments) {
            var clist = props.comments.map(comment => (
                <Reply comment={comment} key={comment.id} />
            ));
            return <section className="com__replies">{clist}</section>;
        }
        return null;
    }

    function Reply(props) {
        return (
            <article className="com com__frame com__child">
                <div className="com__time">
                    {sweDate(props.comment.created)}
                </div>
                <div className="com__author">{props.comment.screenname}</div>
                <Linkify tagName="section" className="com__content">
                    {props.comment.content}
                </Linkify>
            </article>
        );
    }

    function Modal(props) {
        if (!props.isOpen) return <div />;
        return (
            <React.Fragment>
                {" "}
                <div className="modal__overlay" />
                <div className="modal">
                    <button className="modal__closebutton" onClick={closeModal}>
                        Stäng
                    </button>
                    {props.children}
                </div>
            </React.Fragment>
        );
    }

    var [openModal, closeModal] = (function() {
        var modalMount = document.createElement("div");
        modalMount = document.body.appendChild(modalMount);

        var om = function(component) {
            ReactDOM.render(
                <Modal isOpen={true}>{component}</Modal>,
                modalMount
            );
        };

        var cm = function() {
            ReactDOM.render(<Modal isOpen={false} />, modalMount);
        };

        return [om, cm];
    })();

    function CommentStatus() {
        if (isLoggedIn === true) {
            return (
                <div className="com__status">
                    Inloggad som {user.screenname} ({user.username}).
                    <button
                        className="com__logout"
                        onClick={() => sendRequest("logout", null)}
                    >
                        Logga ut.
                    </button>
                </div>
            );
        }
        return (
            <div className="com__status">
                <button
                    className="com__login"
                    onClick={() => openModal(<LoginForm />)}
                >
                    Logga in
                </button>{" "}
                eller{" "}
                <button
                    className="com__newaccount"
                    onClick={() => openModal(<NewAccountForm />)}
                >
                    skapa ett nytt konto
                </button>{" "}
                för att skriva kommentarer.
            </div>
        );
    }

    function CommentForm() {
        const [value, setValue] = useState("");

        if (!isLoggedIn) return null;

        function handleChange(event) {
            setValue(event.target.value);
        }

        function handleSubmit(e) {
            let vals = { content: value, parent: 0, lastid: lastID };
            sendRequest("newcomment", vals, () => setValue(""));
            e.preventDefault();
        }

        return (
            <form className="com__form" onSubmit={handleSubmit}>
                <ExpandingTextArea
                    placeholder="Skriv en kommentar"
                    onChange={handleChange}
                    value={value}
                />
                <button className="com__button"  disabled={value.trim()==""}> Skicka kommentar </button>
            </form>
        );
    }

    function CommentApp(props) {
        return (
            <React.Fragment>
                <CommentStatus />
                <Comments comments={props.comments} />
                <CommentForm />
            </React.Fragment>
        );
    }

    function HTMLComponent({ html }) {
        return (
            <div
                className="modal__guts"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    }

    function LoginForm() {
        const fields = ["cred", "password", "remember"];
        const value = {};
        const setValue = {};
        fields.forEach(e => {
            [value[e], setValue[e]] = useState("");
        });

        function changeHandler(event) {
            setValue[event.target.name](event.target.value);
        }

        function handleSubmit(event) {
            let val = {
                cred: value.cred,
                password: value.password,
                remember: value.remember === "on"
            };
            sendRequest("login", val);
            event.preventDefault();
        }

        return (
            <div className="modal__guts">
                <h1 className="modal__head">Logga in</h1>
                <form className="modal__loginform" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="cred">
                            Användarnamn eller mejladress
                        </label>
                        <input
                            type="text"
                            id="cred"
                            name="cred"
                            minLength="4"
                            maxLength="50"
                            required
                            value={value.cred}
                            onChange={changeHandler}
                        />
                    </div>
                    <div>
                        <label htmlFor="loginpwd">Lösenord</label>
                        <input
                            type="password"
                            id="loginpwd"
                            name="password"
                            minLength="5"
                            maxLength="200"
                            required
                            value={value.password}
                            onChange={changeHandler}
                        />
                    </div>
                    <div>
                        <input
                            type="checkbox"
                            id="remember"
                            name="remember"
                            value={value.remember}
                            onChange={changeHandler}
                        />
                        <label htmlFor="remember">Kom ihåg mig</label>
                    </div>
                    <div>
                        <button className="modal__submitbutton">
                            Logga in
                        </button>
                    </div>
                    <p>Glömt lösenord?</p>
                </form>
            </div>
        );
    }

    function NewAccountForm() {
        var messages = {
            screenname:
                "Visningsnamn måste vara minst 2 och max 30 tecken, får bara innehålla bokstäver, siffror, apostrof och mellanrum. Du får inte heller ha flera mellanrum i följd.",
            username:
                "Användarnamn måste vara minst 4 och max 30 tecken och får bara innehålla bokstäver, siffror, och _, inga mellanrum",
            email: "Det där verkar inte vara en giltig mejladress.",
            password: "Lösenord måste vara minst 5 tecken.",
            pwd2: "Lösenorden matchar inte!"
        };

        const fields = ["screenname", "username", "email", "password", "pwd2"];

        const value = {};
        const setValue = {};
        const isTouched = {};
        const setTouched = {};
        const error = {};
        const setError = {};

        fields.forEach(e => {
            [value[e], setValue[e]] = useState("");
            [isTouched[e], setTouched[e]] = useState(false);
            [error[e], setError[e]] = useState("");
        });

        function changeHandler(event) {
            setValue[event.target.name](event.target.value);
            setTouched[event.target.name](true);
        }

        function validate() {
            var valid = true;
            if (
                value.username.length < 4 ||
                value.username.length > 30 ||
                !value.username.match(/^[\w\u00C0-\u00FF]+$/)
            ) {
                valid = false;
                if (isTouched.username) setError.username(messages.username);
            } else if (error.username !== "") setError.username("");
            if (
                value.screenname.length < 2 ||
                value.screenname.length > 30 ||
                !value.screenname.match(/^(?:[A-Za-z0-9\u00C0-\u00FF]+[' ]?)*$/)
            ) {
                valid = false;
                if (isTouched.screenname)
                    setError.screenname(messages.screenname);
            } else if (error.screenname !== "") setError.screenname("");

            if (
                !value.email.match(
                    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                )
            ) {
                valid = false;
                if (isTouched.email) setError.email(messages.email);
            } else if (error.email !== "") setError.email("");

            if (value.password.length < 5 || value.password.length > 200) {
                valid = false;
                if (isTouched.password) setError.password(messages.password);
            } else if (error.password !== "") setError.password("");

            if (value.pwd2 != value.password) {
                valid = false;
                if (isTouched.pwd2) setError.pwd2(messages.pwd2);
            } else if (error.pwd2 !== "") setError.pwd2("");

            return valid;
        }

        function handleBlur() {
            validate();
        }

        function handleSubmit(event) {
            event.preventDefault();
            fields.forEach(i => setTouched[i](true));
            if (validate()) {
                sendRequest("newaccount", value);
            }
        }

        return (
            <div className="modal__guts">
                <h1 className="modal__head">Skapa nytt konto</h1>
                <form id="new-account-form" onSubmit={handleSubmit}>
                    <p>
                        Du får gärna kommentera här men inte utan en verifierad
                        mejladress. Mejladressen kommer aldrig att synas utåt
                        och vi lovar på heder och samvete att aldrig sprida den
                        vidare. När du har registrerat dig här så mejlar vi dig
                        en länk för att verifiera din mejladress. För att hålla
                        dig inloggad använder vi så kallade kakor (http
                        cookies), du är härmed informerad.
                    </p>
                    <div>
                        <label htmlFor="screenname">
                            Visningsnamn (namnet som andra ser):
                        </label>
                        <input
                            onChange={changeHandler}
                            onBlur={handleBlur}
                            value={value.screenname}
                            type="text"
                            id="screenname"
                            name="screenname"
                            pattern="^(?:[A-Za-z0-9\u00C0-\u00FF]+[' ]?)*$"
                            minLength="2"
                            maxLength="30"
                            required
                        />
                    </div>
                    {error.screenname === "" || (
                        <div className="modal__error">{error.screenname}</div>
                    )}
                    <div>
                        <label htmlFor="uname">
                            Användarnamn (bokstäver, siffror och _, inga
                            mellanrum)
                        </label>
                        <input
                            onChange={changeHandler}
                            onBlur={handleBlur}
                            value={value.username}
                            type="text"
                            id="uname"
                            name="username"
                            minLength="4"
                            maxLength="30"
                            pattern="^[\w\u00C0-\u00FF]+$"
                            required
                        />
                    </div>
                    {error.username === "" || (
                        <div className="modal__error">{error.username}</div>
                    )}
                    <div>
                        <label htmlFor="email">
                            Epost (aldrig synligt för andra användare,
                            verifieras)
                        </label>
                        <input
                            onChange={changeHandler}
                            onBlur={handleBlur}
                            value={value.email}
                            type="email"
                            id="email"
                            name="email"
                            required
                        />
                    </div>
                    {error.email === "" || (
                        <div className="modal__error">{error.email}</div>
                    )}
                    <div>
                        <label htmlFor="pwd">
                            Lösenord (minst 5 tecken men annars fritt)
                        </label>
                        <input
                            onChange={changeHandler}
                            onBlur={handleBlur}
                            value={value.password}
                            type="password"
                            id="pwd"
                            name="password"
                            minLength="5"
                            maxLength="200"
                            required
                        />
                    </div>
                    {error.password === "" || (
                        <div className="modal__error">{error.password}</div>
                    )}
                    <div>
                        <label htmlFor="pwd2">
                            Bekräfta lösenord (you know the drill)
                        </label>
                        <input
                            onChange={changeHandler}
                            onBlur={handleBlur}
                            value={value.pwd2}
                            type="password"
                            id="pwd2"
                            name="pwd2"
                            minLength="5"
                            maxLength="200"
                            required
                        />
                    </div>
                    {error.pwd2 === "" || (
                        <div className="modal__error">{error.pwd2}</div>
                    )}
                    <div>
                        <button>Skapa konto</button>
                    </div>
                </form>
            </div>
        );
    }

    function sendRequest(command, value, callback = null) {
        let request = { command: command, value: value };
        fetch(fetchurl, {
            credentials: "same-origin",
            method: "POST",
            body: JSON.stringify(request)
        })
            .then(response => response.json())
            .then(json => handleJSONResponse(json, callback));
    }

    function handleJSONResponse(r, callback) {
        let command = r.command;
        let value = r.value;
        switch (command) {
            case "init":
                if (value.user) {
                    user = value.user;
                    isLoggedIn = true;
                } else {
                    isLoggedIn = false;
                }
                if (value.comments) {
                    comments = value.comments;
                }
                lastID = value.lastid;
                render();
                break;
            case "newaccount":
                openModal(<HTMLComponent html={value.html} />);
                break;
            case "login":
                if (r.success) {
                    user = value.user;
                    isLoggedIn = true;
                    closeModal();
                    render();
                } else {
                    openModal(<HTMLComponent html={value.html} />);
                }
                break;
            case "logout":
                user = null;
                isLoggedIn = false;
                render();
                break;
            case "newcomment":
                if (r.success) {
                    addComments(value.comments);
                    lastID = value.lastid;
                    if (callback) {
                        callback();
                    }
                    render();
                }
                break;
        }
    }

    var mountNode = document.getElementById("comments");

    function render() {
        ReactDOM.render(<CommentApp comments={comments} />, mountNode);
    }

    sendRequest("", null);
});
