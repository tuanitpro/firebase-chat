'use strict';

function ChatUI() {
    this.public_room_default = '-Ksh3mEVFcwEm5tLYEOo';
    this.$messages = {};
    // Shortcuts to DOM Elements. 
    this.messageList = document.getElementById('messages');
    this.messageForm = document.getElementById('message-form');
    this.messageInput = document.getElementById('message');



    this.submitButton = document.getElementById('submit');
    this.submitImageButton = document.getElementById('submitImage');
    this.imageForm = document.getElementById('image-form');
    this.mediaCapture = document.getElementById('mediaCapture');
    this.userPic = document.getElementById('user-pic');
    this.userName = document.getElementById('user-name');
    this.signInButton = document.getElementById('sign-in');
    this.signOutButton = document.getElementById('sign-out');
    this.signInSnackbar = document.getElementById('must-signin-snackbar');

    var $chat = null;
    var log = console.log;
    // Get a reference to the Firebase Realtime Database
    var chatRef = null;
    var target = document.getElementById("firechat-container");

    var LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';
    var MESSAGE_TEMPLATE =
        '<div class="message-container">' +
        '<div class="spacing"><div class="pic"></div></div>' +
        '<div class="message"></div>' +
        '<div class="name"></div>' +
        '</div>';

    ChatUI.prototype.app_init = function () {
        if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
            window.alert('You have not configured and imported the Firebase SDK. ' +
                'Make sure you go through the codelab setup instructions and make ' +
                'sure you are running the codelab using `firebase serve`');
            return false;
        }
        chatRef = firebase.database().ref();
        this.auth = firebase.auth();

        this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));


        return true;
    };
    ChatUI.prototype.debug = function () {
        log('Debug');
    }
    ChatUI.prototype.run = function (chat) {
        log('Run');

        $('#sign-in').click(function () {
            chat.login();
        });
        $('#sign-out').click(function () {
            logout();
        });
        $('#button_add_room').click(function () {
            var name = $('#room_name').val();
            if (name) {
                $chat.createRoom(name, 'public', function (roomId) {
                    renderListRoom();
                });
            }
        });
        $('#list-room ul li').click(function () {
            log($(this));
        });
    }
    ChatUI.prototype.onAuthStateChanged = function (user) {

        if (user) {
            $chat = new Firechat(chatRef, {});
            var userId = user.uid;
            var username = user.displayName;
            var photoURL = user.photoURL;
            $chat.setUser(userId, username, photoURL, function (user) {
                $chat._user = user;

                $chat.resumeSession();
            });
            this.buildUI();

            // Get profile pic and user's name from the Firebase user object.
            var profilePicUrl = user.photoURL;   // TODO(DEVELOPER): Get profile pic.
            var userName = user.displayName;        // TODO(DEVELOPER): Get user's name.

            // Set the user's profile pic and name.
            this.userPic.style.backgroundImage = 'url(' + profilePicUrl + ')';
            this.userName.textContent = userName;

            // Show user's profile and sign-out button.
            this.userName.removeAttribute('hidden');
            this.userPic.removeAttribute('hidden');
            this.signOutButton.removeAttribute('hidden');

            // Hide sign-in button.
            this.signInButton.setAttribute('hidden', 'true');

            // We load currently existing chant messages.
            this.loadMessages('-Ksko9DhB2UWJaW4G0CE');


            setTimeout(function () {
                $chat.enterRoom('-Ksko9DhB2UWJaW4G0CE')
            }, 500);
        } else {

            //  chat._chat.enterRoom('-Iy1N3xs4kN8iALHV0QA')

            // Hide user's profile and sign-out button.

            this.userName.setAttribute('hidden', 'true');
            this.userPic.setAttribute('hidden', 'true');
            this.signOutButton.setAttribute('hidden', 'true');

            // Show sign-in button.
            this.signInButton.removeAttribute('hidden');
        }

    }
    ChatUI.prototype.buildUI = function () {
        log(this.$messages);
        renderListRoom();
    }

    ChatUI.prototype.showMessage = function (roomId, rawMessage) {
        var self = this;

        // Setup defaults
        var message = {
            id: rawMessage.id,
            localtime: self.formatTime(rawMessage.timestamp),
            message: rawMessage.message || '',
            userId: rawMessage.userId,
            name: rawMessage.name,
            type: rawMessage.type || 'default',
            isSelfMessage: (self._user && rawMessage.userId == self._user.id),
            disableActions: (!self._user || rawMessage.userId == self._user.id)
        };

        // While other data is escaped in the Underscore.js templates, escape and
        // process the message content here to add additional functionality (add links).
        // Also trim the message length to some client-defined maximum.
        var messageConstructed = '';
        message.message = _.map(message.message.split(' '), function (token) {
            if (self.urlPattern.test(token) || self.pseudoUrlPattern.test(token)) {
                return self.linkify(encodeURI(token));
            } else {
                return _.escape(token);
            }
        }).join(' ');
        message.message = self.trimWithEllipsis(message.message, self.maxLengthMessage);

        // Populate and render the message template.
        var template = FirechatDefaultTemplates["templates/message.html"];
        var $message = $(template(message));
        var $messages = self.$messages[roomId];
        if ($messages) {

            var scrollToBottom = false;
            if ($messages.scrollTop() / ($messages[0].scrollHeight - $messages[0].offsetHeight) >= 0.95) {
                // Pinned to bottom
                scrollToBottom = true;
            } else if ($messages[0].scrollHeight <= $messages.height()) {
                // Haven't added the scrollbar yet
                scrollToBottom = true;
            }

            $messages.append($message);

            if (scrollToBottom) {
                $messages.scrollTop($messages[0].scrollHeight);
            }
        }
    };
    ChatUI.prototype.loadMessages = function (roomId) {
        // TODO(DEVELOPER): Load and listens for new messages.
        // Reference to the /messages/ database path.

        this.messagesRef = $chat._messageRef.child(roomId);
        // Make sure we remove all previous listeners.
        this.messagesRef.off();
        // Loads the last 12 messages and listen for new ones.
        var setMessage = function (data) {
            var val = data.val();
            log(val);
            displayMessage(data.key, val);
        }.bind(this);
        this.messagesRef.limitToLast(12).on('child_added', setMessage);
        this.messagesRef.limitToLast(12).on('child_changed', setMessage);
    };

    function displayMessage(key, dataItem) {
        var div = document.getElementById(key);
        var messageList = document.getElementById('messages');
        // If an element for that message does not exists yet we create it.
        if (!div) {
            var container = document.createElement('div');
            container.innerHTML = MESSAGE_TEMPLATE;
            div = container.firstChild;
            div.setAttribute('id', key);
            messageList.appendChild(div);
        }
        if (dataItem.photoUrl) {
            div.querySelector('.pic').style.backgroundImage = 'url(' + dataItem.photoUrl + ')';
        }
        div.querySelector('.name').textContent = dataItem.name + ' at: ' + formatTime(dataItem.timestamp);
        var messageElement = div.querySelector('.message');
        if (dataItem.message) { // If the message is text.
            messageElement.textContent = dataItem.message;
            // Replace all line breaks by <br>.
            messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
        } else if (dataItem.imageUrl) { // If the message is an image.
            var image = document.createElement('img');
            image.addEventListener('load', function () {
                messageList.scrollTop = this.messageList.scrollHeight;
            }.bind(this));
            this.setImageUrl(dataItem.imageUrl, image);
            messageElement.innerHTML = '';
            messageElement.appendChild(image);
        }
        // Show the card fading-in.
        setTimeout(function () { div.classList.add('visible') }, 1);
        messageList.scrollTop = messageList.scrollHeight;
        // this.messageInput.focus();
    };

    function login() {

        var provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider);
        /*
        // Log the user in via Twitter
        var provider = new firebase.auth.TwitterAuthProvider();
        firebase.auth().signInWithPopup(provider).catch(function (error) {
            console.log("Error authenticating user:", error);
        });
        */

    }
    function logout() {
        firebase.auth().signOut().then(function () {
            location.reload();
        }).catch(function (error) {
            console.log("Error signing user out:", error);
        });

    }


    function formatTime(timestamp) {
        var date = (timestamp) ? new Date(timestamp) : new Date(),
            hours = date.getHours() || 12,
            minutes = '' + date.getMinutes(),
            ampm = (date.getHours() >= 12) ? 'pm' : 'am';

        hours = (hours > 12) ? hours - 12 : hours;
        minutes = (minutes.length < 2) ? '0' + minutes : minutes;
        return '' + hours + ':' + minutes + ampm;
    };
    function renderListRoom() {

        $chat.getRoomList(function (_rooms) {

            var html = '';
            html += '<ul>';
            for (var roomId in _rooms) {
                var room = _rooms[roomId];
                if (room.type != "public") continue;
                html += '<li   data-room-type="' + room.type + '" data-room-id="' + room.id + '" data-room-name="' + room.name + '">' + room.name + '</li>';
            }
            html += '</ul>';
            jQuery('#list-room').html(html);
        });
    };
    function loadMessagesByRoom(obj) {
        var roomId = $(obj).data('room-id');
        lgo(roomId);

    }
}

window.onload = function () {
    var chat = new ChatUI();
    chat.app_init();
    chat.run(chat);
};