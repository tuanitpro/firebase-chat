'use strict';

var ChatModule = (function () {
    var log = function (obj) {
        console.log(obj);
    }
    var initFirebaseCheck = function () {
        if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
            window.alert('You have not configured and imported the Firebase SDK. ' +
                'Make sure you go through the codelab setup instructions and make ' +
                'sure you are running the codelab using `firebase serve`');
            return false;
        }
        return true;
    };



    var root = window;
    var module = ChatModule;
    return {

        initFirebase: function () {
            if (initFirebaseCheck()) {
                // TODO(DEVELOPER): Initialize Firebase.
                // Shortcuts to Firebase SDK features.
                log('Init Firebase');
                this._firechatRef = firebase.database;
                this._firebaseApp = firebase.database.app;
                this.auth = firebase.auth();
                this.database = firebase.database();
                this.storage = firebase.storage();

                // User-specific instance variables.
                this._user = null;
                this._userId = null;
                this._userName = null;
                this._isModerator = false;

                // A unique id generated for each session.
                this._sessionId = null;

                // A mapping of event IDs to an array of callbacks.
                this._events = {};

                // A mapping of room IDs to a boolean indicating presence.
                this._rooms = {};

                // A mapping of operations to re-queue on disconnect.
                this._presenceBits = {};

                // Commonly-used Firebase references.
                this._userRef = this.database.ref('users');;

                this._messageRef = this.database.ref('room-messages');
                this._roomRef = this.database.ref('room-metadata');
                this._privateRoomRef = this.database.ref('room-private-metadata');
                this._moderatorsRef = this.database.ref('moderators');
                this._suspensionsRef = this.database.ref('suspensions');
                this._usersOnlineRef = this.database.ref('user-names-online');

                // Setup and establish default options.
                this._options = {};

                // The number of historical messages to load per room.
                this._options.numMaxMessages = this._options.numMaxMessages || 50;

                // Initiates Firebase auth and listen to auth state changes.
             //   this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
             //   log(this._user);
            }
        },
        _addEventCallback: function (eventId, callback) {
            this._events[eventId] = this._events[eventId] || [];
            this._events[eventId].push(callback);
        },
        // Retrieve the list of event handlers for a given event id.
        _getEventCallbacks: function (eventId) {
            if (this._events.hasOwnProperty(eventId)) {
                return this._events[eventId];
            }
            return [];
        },

        // Invoke each of the event handlers for a given event id with specified data.
        _invokeEventCallbacks: function (eventId) {
            var args = [],
                callbacks = this._getEventCallbacks(eventId);

            Array.prototype.push.apply(args, arguments);
            args = args.slice(1);

            for (var i = 0; i < callbacks.length; i += 1) {
                callbacks[i].apply(null, args);
            }
        },
        setUser: function (user, callback) {
            var self = this;

            if (user) {
                var userId = user.uid;
                var userName = user.displayName;
                self._userId = userId.toString();
                self._userName = userName.toString();
                self._userRef = self.database.ref('users').child(self._userId);
                self._sessionRef = self._userRef.child('sessions').push();
                self._sessionId = self._sessionRef.key;

                callback(this.loadUserMetadata);
            }
            else {
                log('Firechat requires an authenticated Firebase reference. Pass an authenticated reference before loading.');
            }
        },
        getUser: function () {
            log(this._user);
            return this._user;
        },
        loadUserMetadata: function (onComplete) {
            var self = this;
            log(self._userId);
            // Update the user record with a default name on user's first visit.
            firebase.database().ref('users').transaction(function (current) {
                if (!current || !current.id || !current.name) {
                    return {
                        id: self._userId,
                        name: self._userName
                    };
                }
            }, function (error, committed, snapshot) {
                self._user = snapshot.val();
                self._moderatorsRef.child(self._userId).once('value', function (snapshot) {
                    self._isModerator = !!snapshot.val();
                    root.setTimeout(onComplete, 0);
                });
            });
        },

        signIn: function () {
            // TODO(DEVELOPER): Sign in Firebase with credential from the Google user.
            // Sign in Firebase using popup auth and Google as the identity provider.
            log('SignIn');
            var provider = new firebase.auth.GoogleAuthProvider();
            this.auth.signInWithPopup(provider);
        },

        // Signs-out of Friendly Chat.
        signOut: function () {
            // TODO(DEVELOPER): Sign out of Firebase.
            // Sign out of Firebase.
            this.auth.signOut();
        },
        // Triggers when the auth state change for instance when the user signs-in or signs-out.
        onAuthStateChanged: function (user) {

            var self = this;
            if (user) { // User is signed in!
                this._user = user;
                log(this._user);
                // Get profile pic and user's name from the Firebase user object.
                var profilePicUrl = user.photoURL;   // TODO(DEVELOPER): Get profile pic.
                var userName = user.displayName;        // TODO(DEVELOPER): Get user's name.
                var userId = user.uid;
                var self = this;
                self._userId = userId.toString();
                self._userName = userName.toString();
                self._userRef = self._userRef.child(userId);
                self._sessionRef = self._userRef.child(userId).child('sessions').push();
                self._sessionId = self._sessionRef.key;



                //   this.setUser(user, this.loadUserMetadata);

                // We save the Firebase Messaging Device token and enable notifications.
                // this.saveMessagingDeviceToken();
            } else { // User is signed out!                
                log('Firechat requires an authenticated Firebase reference. Pass an authenticated reference before loading.');
            }
        },

        createRoom: function (roomName, roomType, callback) {
            var self = this,
                newRoomRef = this._roomRef.push();

            var newRoom = {
                id: newRoomRef.key,
                name: roomName,
                type: roomType || 'public',
                createdByUserId: this._userId,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };

            if (roomType === 'private') {
                newRoom.authorizedUsers = {};
                newRoom.authorizedUsers[this._userId] = true;
            }

            newRoomRef.set(newRoom, function (error) {
                if (!error) {
                    log('Done');
                    // self.enterRoom(newRoomRef.key);

                }
                if (callback) {
                    callback(newRoomRef.key);
                }
            });
        },
        getRoom: function (roomId, callback) {
            this._roomRef.child(roomId).once('value', function (snapshot) {
                callback(snapshot.val());
            });
        },
        getRoomList: function (cb) {
            var self = this;

            self._roomRef.once('value', function (snapshot) {
                cb(snapshot.val());
            });
        },

    }

})();


