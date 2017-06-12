'use strict';

var seneca = require('seneca')();
var nconf = require('nconf');
var MarioConnect = require('mario-connect');
var SMP = require('service-metadata-provider');

nconf.argv()
      .env()
      .file({ file: 'config.json' });

var smp = new SMP(nconf.get("participantIdentifier"), nconf.get("username"), nconf.get("password"),  nconf.get("mariosbossurl"));
var managedConcept = nconf.get("managedConcept");
console.log("Starting to manage: " + managedConcept);
console.log("MarioHQ: " + nconf.get("mariosbossurl"));

new MarioConnect(seneca, managedConcept)
    .start()
    .catch(function(e) {
        console.error(e);
        process.exit(1);
    });

// Provided Services implementation
seneca.add({concept: "Participant"}, function (msg, respond) {

  var content = msg.content.item;
  if(!content){
    content = msg.content;
  }

  // TODO Handle per action
  switch(msg.action) {
    case "Create":
    case "Update":
    case "Upsert":
      // POST to Mario's Boss
      console.log("New/Update Participant", msg);

      if(!content.name) {
        console.warn("No Name specified.", content);
      }
      else if(!content.username) {
        console.warn("No username specified.", content);
      }
      else if(!content.password) {
        console.warn("No password specified.", content);
      }
      else {
        smp.manageParticipant("Update", content.name, content.username, content.password)
        .then(function(result) {
          console.log("Metadata submitted for registration with Mario", result);

          if (!content.publishedEvents) {
            return;
          }

          for( var i = 0; i < content.publishedEvents.length; i++ ) {
            var ev = content.publishedEvents[i];
            smp.registerEventService(content.name, ev.eventconcept, ev.eventaction)
              .then(function(result) {
                console.log("Event publishing: " + ev.name + " from " + content.name + " submitted to Mario", result);
              })
              .catch(function(e){
                console.log(content);
                console.error(e);
              });
          }

        })
        .catch(function(e){
          console.log(content);
          console.error(e);
        });
      }

      break;
    case "Delete":
      // POST to Mario's Boss
      console.log("New/Update Participant", msg);

      if(!content.name) {
        console.warn("No Name specified.", content);
      }
      else if(!content.username) {
        console.warn("No username specified.", content);
      }
      else {
        smp.manageParticipant("Delete", content.name, content.username, content.password)
        .then(function(result) {
          console.log("Metadata submitted for deletion with Mario", result);
        })
        .catch(function(e){
          console.log(content);
          console.error(e);
        });
      }
      break;
    case "DeleteAll":
      break;
    default:
      console.log("Don't know how to handle " + msg.concept + "." + msg.action);
      break;
  }

respond(null, null);

});

// Provided Services implementation
seneca.add({concept: "Service"}, function (msg, respond) {
  try {
    var content = msg.content.item;
    if(!content){
      content = msg.content;
    }

    // TODO Handle per action
    switch(msg.action) {
      case "Create":
      case "Update":
      case "Upsert":
        // POST to Mario's Boss
        console.log("New/Update Service", msg);

        if(!content.owner) {
          console.warn("No Owner specified.", content);
        }
        else if(!content.ownerName) {
          console.warn("No OwnerName specified.", content);
        }
        else if(!content.concept) {
          console.warn("No Concept specified.", content);
        }
        else if(!content.action) {
          console.warn("No Action specified.", content);
        }
        else {
          smp.registerSimpleService(content.ownerName, content.concept, content.action)
          .then(function(result) {
            console.log("Metadata submitted for registration with Mario", result);
          })
          .catch(function(e){
            console.log(content);
            console.error(e);
          });
        }

        break;
      case "Delete":
        console.log("TODO - Delete as soon as Mario's Boss implements it");
        break;
      case "DeleteAll":
        console.log("TODO - DeleteAll as soon as Mario's Boss implements it");
        break;
      default:
        console.log("Don't know how to handle " + msg.concept + "." + msg.action);
        break;
    }
    respond(null, {answer: 'ok!'});
  }
  catch(e){
    respond(e, null);
  }
});

// Provided Services implementation
seneca.add({concept: "ServiceAgreement"}, function (msg, respond) {
  try {
    var content = msg.content.item;
    if(!content){
      content = msg.content;
    }

    // TODO Handle per action
    switch(msg.action) {
      case "Create":
      case "Update":
      case "Upsert":
        // POST to Mario's Boss
        console.log("New/Update ServiceAgreement", msg);

        if(!content.agreedParticipantName) {
          console.warn("No Agreed Participant specified.", content);
        }
        else if(!content.concept) {
          console.warn("No Concept specified.", content);
        }
        else if(!content.action) {
          console.warn("No Action specified.", content);
        }
        else {
          var ownerParticipantName = content.ownerParticipantName;
          var agreementType = "Public";
          if(ownerParticipantName !== "*" && ownerParticipantName !== "") {
            agreementType = "Private";
          }
          else {
            ownerParticipantName = "";
          }

          if(content.agreementType === "1") {
            smp.registerToEventService(content.agreedParticipantName, content.concept, content.action, agreementType, ownerParticipantName)
            .then(function(result) {
              console.log("Consume Event metadata submitted for registration with Mario", result);
            })
            .catch(function(e){
              console.log(content);
              console.error(e);
            });
          }
          else if(content.agreementType === "0") {

            if(agreementType === "Private"){
              // Let provider know he is providing the service to the specified consumer
              smp.registerSimpleService(ownerParticipantName, content.concept, content.action, agreementType, content.agreedParticipantName)
              .then(function(result) {
                console.log("'Provide Service to a specific Participant' metadata submitted for registration with Mario", result);

                // Register consumer
                smp.registerToSimpleService(content.agreedParticipantName, content.concept, content.action, agreementType, ownerParticipantName)
                  .then(function(result) {
                    console.log("Consume Service metadata submitted for registration with Mario", result);
                  })
                  .catch(function(e){
                    console.log(content);
                    console.error(e);
                  });
              })
              .catch(function(e){
                console.log(content);
                console.error(e);
              });
            }
            else {
              smp.registerToSimpleService(content.agreedParticipantName, content.concept, content.action, agreementType, ownerParticipantName)
              .then(function(result) {
                console.log("Consume Service metadata submitted for registration with Mario", result);
              })
              .catch(function(e){
                console.log(content);
                console.error(e);
              });
            }
          }
        }

        break;
      case "Delete":
        console.log("TODO - Delete as soon as Mario's Boss implements it");
        break;
      case "DeleteAll":
        console.log("TODO - DeleteAll as soon as Mario's Boss implements it");
        break;
      default:
        console.log("Don't know how to handle " + msg.concept + "." + msg.action);
        break;
    }
    respond(null, {answer: 'ok!'});
  }
  catch(e){
    respond(e, null);
  }
});

// Provided Services implementation
seneca.add({concept: "Event"}, function (msg, respond) {
  try {
    var content = msg.content.item;
    if(!content){
      content = msg.content;
    }

    // TODO Handle per action
    switch(msg.action) {
      case "Create":
      case "Update":
      case "Upsert":
        // POST to Mario's Boss
        console.log("New/Update Event", msg);

        if(!content.concept) {
          console.warn("No Concept specified.", content);
        }
        else if(!content.action) {
          console.warn("No Action specified.", content);
        }
        else {
          smp.registerEventService("*", content.concept, content.action)
          .then(function(result) {
            console.log("Metadata submitted for registration with Mario", result);
          })
          .catch(function(e){
            console.log(content);
            console.error(e);
          });
        }

        break;
      case "Delete":
        console.log("TODO - Delete as soon as Mario's Boss implements it");
        break;
      case "DeleteAll":
        console.log("TODO - DeleteAll as soon as Mario's Boss implements it");
        break;
      default:
        console.log("Don't know how to handle " + msg.concept + "." + msg.action);
        break;
    }
    respond(null, {answer: 'ok!'});
  }
  catch(e){
    respond(e, null);
  }
});
