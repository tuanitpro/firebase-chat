'use strict';

// Template for messages.
var LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';
var MESSAGE_TEMPLATE =
  '<div class="message-container">' +
  '<div class="spacing"><div class="pic"></div></div>' +
  '<div class="message"></div>' +
  '<div class="name"></div>' +
  '</div>';

var messageList = document.getElementById('messages');
var messageForm = document.getElementById('message-form');
var messageInput = document.getElementById('message');

var public_room_default = '-Ksko9DhB2UWJaW4G0CE';
var sessionId = null;
var _rooms = [];

var auth = null;
var database = null;
var storage = null;
var roomRef = null;
var roomMessageRef = null;
var userRef = null;
var usersOnlineRef = null;
var messagesRef = null;

// Saves a new message on the Firebase DB.
function saveMessage() {

  // Check that the user entered a message and is signed in.
  if ($('#message').val() && checkSignedInWithMessage()) {
    var currentUser = auth.currentUser;
    // Add a new message entry to the Firebase Database.
    var displayName = currentUser.displayName;
    var photoURL = currentUser.photoURL;
    var isAnonymous = currentUser.isAnonymous;
    if (isAnonymous) {
      displayName = 'ANONYMOUS';
      photoURL = '/images/profile_placeholder.png';
    }


    var roomId = public_room_default;
    messagesRef = roomMessageRef.child(roomId);
    messagesRef.push({
      name: displayName,
      message: $('#message').val(),
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      photoUrl: photoURL || '/images/profile_placeholder.png'
    }).then(function () {
      // Clear message text field and SEND button state.
      $('#message').val('');

    }.bind(this)).catch(function (error) {
      console.error('Error writing new message to Firebase Database', error);
    });
  }
};

// Saves a new message containing an image URI in Firebase.
// This first saves the image in Firebase storage.
function saveImageMessage() {

  var file = $('#mediaCapture').get(0).files[0];
  // Clear the selection in the file picker input.
  document.getElementById('image-form').reset();
  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      message: 'You can only share images',
      timeout: 2000
    };
    //this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Check if the user is signed-in
  if (checkSignedInWithMessage()) {

    // TODO(DEVELOPER): Upload image to Firebase storage and add message.
    if (auth.currentUser) {
      // return true;
    }

    // We add a message with a loading icon that will get updated with the shared image.
    var currentUser = auth.currentUser;
    var displayName = currentUser.displayName;
    var photoURL = currentUser.photoURL;
    var isAnonymous = currentUser.isAnonymous;
    if (isAnonymous) {
      displayName = 'ANONYMOUS';
      photoURL = '/images/profile_placeholder.png';
    }
    messagesRef.push({
      name: displayName,
      imageUrl: LOADING_IMAGE_URL,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      photoUrl: photoURL || '/images/profile_placeholder.png'
    }).then(function (data) {

      // Upload the image to Cloud Storage.
      var filePath = currentUser.uid + '/' + data.key + '/' + file.name;
      return storage.ref(filePath).put(file).then(function (snapshot) {

        // Get the file's Storage URI and update the chat message placeholder.
        var fullPath = snapshot.metadata.fullPath;
        return data.update({ imageUrl: storage.ref(fullPath).toString() });
      }.bind(this));
    }.bind(this)).catch(function (error) {
      console.error('There was an error uploading a file to Cloud Storage:', error);
    });
  }
};



// Resumes the previous session by automatically entering rooms.
function resumeSession() {
  this._userRef.child('rooms').once('value', function (snapshot) {
    var rooms = snapshot.val();
    for (var roomId in rooms) {
      console.log(rooms[roomId].id);
      //  this.enterRoom(rooms[roomId].id);
    }
  }, /* onError */ function () { }, /* context */ this);
};


// Saves the messaging device token to the datastore.
function saveMessagingDeviceToken() {
  // TODO(DEVELOPER): Save the device token in the realtime datastore
};

// Requests permissions to show notifications.
function requestNotificationsPermissions() {
  // TODO(DEVELOPER): Request permissions to send notifications.
};



function formatTime(timestamp) {
  var date = (timestamp) ? new Date(timestamp) : new Date(),
    hours = date.getHours() || 12,
    minutes = '' + date.getMinutes(),
    ampm = (date.getHours() >= 12) ? 'pm' : 'am';

  hours = (hours > 12) ? hours - 12 : hours;
  minutes = (minutes.length < 2) ? '0' + minutes : minutes;
  return '' + hours + ':' + minutes + ampm;
};
function checkSetup() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
      'Make sure you go through the codelab setup instructions and make ' +
      'sure you are running the codelab using `firebase serve`');
    return false;
  }
  return true;
}
// Sets up shortcuts to Firebase features and initiate firebase auth.
function initFirebase() {
  // TODO(DEVELOPER): Initialize Firebase.
  // Shortcuts to Firebase SDK features.
  auth = firebase.auth();
  database = firebase.database();
  storage = firebase.storage();
  // Initiates Firebase auth and listen to auth state changes.
  auth.onAuthStateChanged(onAuthStateChanged);
  roomRef = database.ref('room-metadata');
  roomMessageRef = database.ref('room-messages');
  userRef = database.ref('users');
  usersOnlineRef = database.ref('user-names-online');


};

// Returns true if user is signed-in. Otherwise false and displays a message.
function checkSignedInWithMessage() {
  /* TODO(DEVELOPER): Check if user is signed-in Firebase. */
  if (auth.currentUser) {
    return true;
  }
  // Display a message to the user using a Toast.
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  document.getElementById('must-signin-snackbar').MaterialSnackbar.showSnackbar(data);
  return false;
};

// Signs-in Friendly Chat.
function signIn() {
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
function signOut() {
  // TODO(DEVELOPER): Sign out of Firebase.
  // Sign out of Firebase.
  auth.signOut();
};

function onAuthStateChanged(user) {
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
    document.getElementById('user-pic').style.backgroundImage = 'url(' + profilePicUrl + ')';
    document.getElementById('user-name').textContent = userName;

    // Show user's profile and sign-out button.
    document.getElementById('user-name').removeAttribute('hidden');
    document.getElementById('user-pic').removeAttribute('hidden');

    $('#sign-out').removeAttr('hidden');
    // Hide sign-in button.
    $('#sign-in').attr('hidden', 'true');


    var userInfo = {
      username: userName,
      email: user.email,
      photoURL: user.photoURL,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    };
    var roomId = public_room_default;
    var userkey = user.uid;
    var usersRef = userRef.child(userkey);
    usersRef.set(userInfo);
    var sessionRef = userRef.child(userkey).child("sessions").push();
    var sessionKey = sessionRef.key;
    sessionRef.set(true);
    sessionId = sessionKey;
    var usernameRef = usersOnlineRef.child(userName.toLowerCase());
    var usernameSessionRef = usernameRef.child(sessionKey);
    usernameSessionRef.set({
      id: userkey,
      name: userName
    });
    // Listen for state changes for the given user.
    // this._userRef.on('value', this._onUpdateUser, this);


    //  this.userRef.child(userkey).child("sessions").set(sessionKey);

    getAllRooms();
    /*
    var roomId = this.public_room_default;
    if (this._rooms.length > 0) {
      console.log(this._rooms[0]);
      roomId = this._rooms[0].id;

    }
 */
    // We load currently existing chant messages.

    enterRoom(roomId);

    // We save the Firebase Messaging Device token and enable notifications.
    saveMessagingDeviceToken();
  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    $('#user-name').attr('hidden', 'true');

    $('#user-pic').attr('hidden', 'true');
    $('#sign-out').attr('hidden', 'true');

    // Show sign-in button.

    $('#sign-in').removeAttr('hidden', 'true');

  }
};
function setImageUrl(imageUri, imgElement) {
  // imgElement.src = imageUri;

  if (imageUri.startsWith('gs://')) {
    imgElement.src = LOADING_IMAGE_URL; // Display a loading image first.
    storage.refFromURL(imageUri).getMetadata().then(function (metadata) {
      imgElement.src = metadata.downloadURLs[0];
    });
  } else {
    imgElement.src = imageUri;
  }
  // TODO(DEVELOPER): If image is on Cloud Storage, fetch image URL and set img element's src.
};
// Displays a Message in the UI.
function displayMessage(key, dataItem) {
  var div = document.getElementById(key);
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
      messageList.scrollTop = messageList.scrollHeight;
    }.bind(this));

    setImageUrl(dataItem.imageUrl, image);


    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Show the card fading-in.
  setTimeout(function () { div.classList.add('visible') }, 1);
  messageList.scrollTop = messageList.scrollHeight;
  messageInput.focus();
};
// Loads chat messages history and listens for upcoming ones.
function enterRoom(roomId) {
  // TODO(DEVELOPER): Load and listens for new messages.
  // Reference to the /messages/ database path.
  $('#messages').empty();
  messagesRef = roomMessageRef.child(roomId);
  public_room_default = roomId;
  // Make sure we remove all previous listeners.
  messagesRef.off();
  // Loads the last 12 messages and listen for new ones.
  var setMessage = function (data) {
    var val = data.val();

    displayMessage(data.key, val);
  }.bind(this);

  messagesRef.limitToLast(12).on('child_added', setMessage);
  messagesRef.limitToLast(12).on('child_changed', setMessage);
};
function createRoom() {
  if (checkSignedInWithMessage()) {
    var name = $('#room_name').val();
    if (name) {
      var currentUser = auth.currentUser;


      // var key = window.btoa(name);
      var key = roomRef.push().key;
      roomRef.child(key).set({
        id: key,
        name: name,
        type: 'public',
        createdByUserId: currentUser.uid,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      }).then(function () {
        // Clear message text field and SEND button state.
        $('#room_name').val('');
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
function getAllRooms() {
  if (checkSignedInWithMessage()) {
    roomRef.once('value', function (snapshot) {
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

      $('li.room-item').on('click', function (e) {
        var roomId = $(this).data('room-id');
        console.log(roomId);

        enterRoom(roomId);
      });

    });
  }
}

/*************************************************************** */

window.onload = function () {
  if (checkSetup()) {
    initFirebase();
    $('#sign-in').click(function () {
      signIn();
    });
    $('#sign-out').click(function () {
      signOut();
    });
    $('#button_add_room').click(function () {
      createRoom();
    });
    $('#submit').click(function () {
      saveMessage();
    });
    $('#submitImage').click(function () {
      $('#mediaCapture').trigger('click');
      // saveImageMessage();
    });
    $('#mediaCapture').change(function () {
      saveImageMessage();
    });
  }
};
