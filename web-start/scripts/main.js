/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// Initializes FriendlyChat.
function FriendlyChat() {
  this.checkSetup();
  this._rooms = [];
  this.public_room_default = '-Ksko9DhB2UWJaW4G0CE';

  this.sessionId = '';
  // Shortcuts to DOM Elements.
  this.messageList = document.getElementById('messages');
  this.messageForm = document.getElementById('message-form');
  this.messageInput = document.getElementById('message');

  this.roomNameInput = document.getElementById('room_name');
  this.listRooms = document.getElementById('list-room');

  this.submitButton = document.getElementById('submit');
  this.submitImageButton = document.getElementById('submitImage');
  this.imageForm = document.getElementById('image-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');

  this.addNewRoomButton = document.getElementById('button_add_room');

  // Saves message on form submit.
  this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInButton.addEventListener('click', this.signIn.bind(this));
  this.addNewRoomButton.addEventListener('click', this.createRoom.bind(this));
  // Toggle for the button.
  var buttonTogglingHandler = this.toggleButton.bind(this);
  this.messageInput.addEventListener('keyup', buttonTogglingHandler);
  this.messageInput.addEventListener('change', buttonTogglingHandler);

  // Events for image upload.
  this.submitImageButton.addEventListener('click', function (e) {
    e.preventDefault();
    this.mediaCapture.click();
  }.bind(this));
  this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));


  
  

$(document).ready(function(){
  console.log('document.ready');
 

});
  

  this.initFirebase();
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
FriendlyChat.prototype.initFirebase = function () {
  // TODO(DEVELOPER): Initialize Firebase.
  // Shortcuts to Firebase SDK features.
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();
  // Initiates Firebase auth and listen to auth state changes.
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
  this.roomRef = this.database.ref('room-metadata');
  this.roomMessageRef = this.database.ref('room-messages');
  this.userRef = this.database.ref('users');
  this.usersOnlineRef = this.database.ref('user-names-online');


};

// tuanlt20170829
FriendlyChat.prototype.createRoom = function () {
  if (this.checkSignedInWithMessage()) {
    var name = this.roomNameInput.value;
    if (name) {
      var currentUser = this.auth.currentUser;


      // var key = window.btoa(name);
      var key = this.roomRef.push().key;
      this.roomRef.child(key).set({
        id: key,
        name: name,
        type: 'public',
        createdByUserId: currentUser.uid,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      }).then(function () {
        // Clear message text field and SEND button state.
        FriendlyChat.resetMaterialTextfield(this.roomNameInput);
        console.log('Done');
      }.bind(this)).catch(function (error) {
        console.error('Error writing new room to Firebase Database', error);
      });
    }
  }
  else {
    // Display a message to the user using a Toast.
    var data = {
      message: 'You must sign-in first',
      timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return false;
  }
}
FriendlyChat.prototype.getAllRooms = function () {
  if (this.checkSignedInWithMessage()) {
    this.roomRef.once('value', function (snapshot) {
  //    console.log(snapshot.val());
      var data = snapshot.val();
      var html = '';
      html += '<ul id="rooms">';
      for (var roomId in data) {
        var room = data[roomId];
        if (room.type != "public") continue;
        html += '<li class="room-item"   data-room-type="' + room.type + '" data-room-id="' + room.id + '" data-room-name="' + room.name + '">' + room.name + '</li>';

      }
      html += '</ul>';
      document.getElementById('list-room').innerHTML = html;

      $('li.room-item').on('click',function (e) {
        var roomId = $(this).data('room-id');
        console.log(roomId);

       // new FriendlyChat().loadMessages(roomId);
      });

    });
  }
}

FriendlyChat.prototype.joinRoom = function (roomId) {
  console.log(roomId);
}
// Loads chat messages history and listens for upcoming ones.
FriendlyChat.prototype.loadMessages = function (roomId) {
  // TODO(DEVELOPER): Load and listens for new messages.
  // Reference to the /messages/ database path.

  this.messagesRef = this.roomMessageRef.child(roomId);
  // Make sure we remove all previous listeners.
  this.messagesRef.off();
  // Loads the last 12 messages and listen for new ones.
  var setMessage = function (data) {
    var val = data.val();

    this.displayMessage(data.key, val);
  }.bind(this);
  this.messagesRef.limitToLast(12).on('child_added', setMessage);
  this.messagesRef.limitToLast(12).on('child_changed', setMessage);
};

// Saves a new message on the Firebase DB.
FriendlyChat.prototype.saveMessage = function (e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (this.messageInput.value && this.checkSignedInWithMessage()) {
    var currentUser = this.auth.currentUser;
    // Add a new message entry to the Firebase Database.
    var displayName = currentUser.displayName;
    var photoURL = currentUser.photoURL;
    var isAnonymous = currentUser.isAnonymous;
    if (isAnonymous) {
      displayName = 'ANONYMOUS';
      photoURL = '/images/profile_placeholder.png';
    }


    var roomId = this.public_room_default;
    this.messagesRef = this.roomMessageRef.child(roomId);
    this.messagesRef.push({
      name: displayName,
      message: this.messageInput.value,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      photoUrl: photoURL || '/images/profile_placeholder.png'
    }).then(function () {
      // Clear message text field and SEND button state.
      FriendlyChat.resetMaterialTextfield(this.messageInput);
      this.toggleButton();
    }.bind(this)).catch(function (error) {
      console.error('Error writing new message to Firebase Database', error);
    });
  }
};

// Sets the URL of the given img element with the URL of the image stored in Cloud Storage.
FriendlyChat.prototype.setImageUrl = function (imageUri, imgElement) {
  // imgElement.src = imageUri;

  if (imageUri.startsWith('gs://')) {
    imgElement.src = FriendlyChat.LOADING_IMAGE_URL; // Display a loading image first.
    this.storage.refFromURL(imageUri).getMetadata().then(function (metadata) {
      imgElement.src = metadata.downloadURLs[0];
    });
  } else {
    imgElement.src = imageUri;
  }
  // TODO(DEVELOPER): If image is on Cloud Storage, fetch image URL and set img element's src.
};

// Saves a new message containing an image URI in Firebase.
// This first saves the image in Firebase storage.
FriendlyChat.prototype.saveImageMessage = function (event) {
  event.preventDefault();
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  this.imageForm.reset();

  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      message: 'You can only share images',
      timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Check if the user is signed-in
  if (this.checkSignedInWithMessage()) {

    // TODO(DEVELOPER): Upload image to Firebase storage and add message.
    if (this.auth.currentUser) {
      // return true;
    }

    // We add a message with a loading icon that will get updated with the shared image.
    var currentUser = this.auth.currentUser;
    var displayName = currentUser.displayName;
    var photoURL = currentUser.photoURL;
    var isAnonymous = currentUser.isAnonymous;
    if (isAnonymous) {
      displayName = 'ANONYMOUS';
      photoURL = '/images/profile_placeholder.png';
    }
    this.messagesRef.push({
      name: displayName,
      imageUrl: FriendlyChat.LOADING_IMAGE_URL,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      photoUrl: photoURL || '/images/profile_placeholder.png'
    }).then(function (data) {

      // Upload the image to Cloud Storage.
      var filePath = currentUser.uid + '/' + data.key + '/' + file.name;
      return this.storage.ref(filePath).put(file).then(function (snapshot) {

        // Get the file's Storage URI and update the chat message placeholder.
        var fullPath = snapshot.metadata.fullPath;
        return data.update({ imageUrl: this.storage.ref(fullPath).toString() });
      }.bind(this));
    }.bind(this)).catch(function (error) {
      console.error('There was an error uploading a file to Cloud Storage:', error);
    });
  }
};

// Signs-in Friendly Chat.
FriendlyChat.prototype.signIn = function () {
  // TODO(DEVELOPER): Sign in Firebase with credential from the Google user.
  // Sign in Firebase using popup auth and Google as the identity provider.


  /*
  var provider = new firebase.auth.GoogleAuthProvider();
  this.auth.signInWithPopup(provider);

  */

  firebase.auth().signInAnonymously().catch(function (error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    console.log(errorCode);
    console.log(errorMessage);
    // ...
  });

};

// Signs-out of Friendly Chat.
FriendlyChat.prototype.signOut = function () {
  // TODO(DEVELOPER): Sign out of Firebase.
  // Sign out of Firebase.
  this.auth.signOut();
};

// Triggers when the auth state change for instance when the user signs-in or signs-out.
FriendlyChat.prototype.onAuthStateChanged = function (user) {
  if (user) { // User is signed in!
    // Get profile pic and user's name from the Firebase user object.
    var profilePicUrl = user.photoURL;   // TODO(DEVELOPER): Get profile pic.
    var userName = user.displayName;        // TODO(DEVELOPER): Get user's name.


    var isAnonymous = user.isAnonymous;
    if (isAnonymous) {
      userName = 'ANONYMOUS';
      profilePicUrl = '/images/profile_placeholder.png';
    }

    // Set the user's profile pic and name.
    this.userPic.style.backgroundImage = 'url(' + profilePicUrl + ')';
    this.userName.textContent = userName;

    // Show user's profile and sign-out button.
    this.userName.removeAttribute('hidden');
    this.userPic.removeAttribute('hidden');
    this.signOutButton.removeAttribute('hidden');

    // Hide sign-in button.
    this.signInButton.setAttribute('hidden', 'true');


    var userInfo = {
      username: userName,
      email: user.email,
      photoURL: user.photoURL,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    };
    var roomId = this.public_room_default;
    var userkey = user.uid;
    this.usersRef = this.userRef.child(userkey);
    this.usersRef.set(userInfo);
    var sessionRef = this.userRef.child(userkey).child("sessions").push();
    var sessionKey = sessionRef.key;
    sessionRef.set(true);
    this.sessionId = sessionKey;
    var usernameRef = this.usersOnlineRef.child(userName.toLowerCase());
    var usernameSessionRef = usernameRef.child(sessionKey);
    usernameSessionRef.set({
      id: userkey,
      name: userName
    });

    // Listen for state changes for the given user.
    // this._userRef.on('value', this._onUpdateUser, this);


    //  this.userRef.child(userkey).child("sessions").set(sessionKey);


    this.getAllRooms();
    var roomId = this.public_room_default;
    if (this._rooms.length > 0) {
      console.log(this._rooms[0]);
      roomId = this._rooms[0].id;
     
    }

    // We load currently existing chant messages.

    this.loadMessages(roomId);

    // We save the Firebase Messaging Device token and enable notifications.
    this.saveMessagingDeviceToken();
  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    this.userName.setAttribute('hidden', 'true');
    this.userPic.setAttribute('hidden', 'true');
    this.signOutButton.setAttribute('hidden', 'true');

    // Show sign-in button.
    this.signInButton.removeAttribute('hidden');


  }
};

// Returns true if user is signed-in. Otherwise false and displays a message.
FriendlyChat.prototype.checkSignedInWithMessage = function () {
  /* TODO(DEVELOPER): Check if user is signed-in Firebase. */
  if (this.auth.currentUser) {
    return true;
  }
  // Display a message to the user using a Toast.
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
  return false;
};


// Resumes the previous session by automatically entering rooms.
FriendlyChat.prototype.resumeSession = function () {
  this._userRef.child('rooms').once('value', function (snapshot) {
    var rooms = snapshot.val();
    for (var roomId in rooms) {
      console.log(rooms[roomId].id);
      //  this.enterRoom(rooms[roomId].id);
    }
  }, /* onError */ function () { }, /* context */ this);
};


// Saves the messaging device token to the datastore.
FriendlyChat.prototype.saveMessagingDeviceToken = function () {
  // TODO(DEVELOPER): Save the device token in the realtime datastore
};

// Requests permissions to show notifications.
FriendlyChat.prototype.requestNotificationsPermissions = function () {
  // TODO(DEVELOPER): Request permissions to send notifications.
};

// Resets the given MaterialTextField.
FriendlyChat.resetMaterialTextfield = function (element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

// Template for messages.
FriendlyChat.MESSAGE_TEMPLATE =
  '<div class="message-container">' +
  '<div class="spacing"><div class="pic"></div></div>' +
  '<div class="message"></div>' +
  '<div class="name"></div>' +
  '</div>';

// A loading image URL.
FriendlyChat.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

// Displays a Message in the UI.
FriendlyChat.prototype.displayMessage = function (key, dataItem) {
  var div = document.getElementById(key);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = FriendlyChat.MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.messageList.appendChild(div);
  }
  if (dataItem.photoUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + dataItem.photoUrl + ')';
  }
  div.querySelector('.name').textContent = dataItem.name + ' at: ' + this.formatTime(dataItem.timestamp);
  var messageElement = div.querySelector('.message');
  if (dataItem.message) { // If the message is text.
    messageElement.textContent = dataItem.message;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (dataItem.imageUrl) { // If the message is an image.
    var image = document.createElement('img');
    image.addEventListener('load', function () {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }.bind(this));
    this.setImageUrl(dataItem.imageUrl, image);
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Show the card fading-in.
  setTimeout(function () { div.classList.add('visible') }, 1);
  this.messageList.scrollTop = this.messageList.scrollHeight;
  this.messageInput.focus();
};

// Enables or disables the submit button depending on the values of the input
// fields.
FriendlyChat.prototype.toggleButton = function () {
  if (this.messageInput.value) {
    this.submitButton.removeAttribute('disabled');
  } else {
    this.submitButton.setAttribute('disabled', 'true');
  }
};

// Checks that the Firebase SDK has been correctly setup and configured.
FriendlyChat.prototype.checkSetup = function () {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
      'Make sure you go through the codelab setup instructions and make ' +
      'sure you are running the codelab using `firebase serve`');
  }
};
FriendlyChat.prototype.formatTime = function (timestamp) {
  var date = (timestamp) ? new Date(timestamp) : new Date(),
    hours = date.getHours() || 12,
    minutes = '' + date.getMinutes(),
    ampm = (date.getHours() >= 12) ? 'pm' : 'am';

  hours = (hours > 12) ? hours - 12 : hours;
  minutes = (minutes.length < 2) ? '0' + minutes : minutes;
  return '' + hours + ':' + minutes + ampm;
};
window.onload = function () {
  window.friendlyChat = new FriendlyChat();
};
