# Synapse SMS Wrapper README

# Overview
This repo contains code for a Twilio-Python SMS interface for the Synapse App. Here you can find the necessary
files for hosting this app on [Heroku](https://heroku.com).

smsInterface.py - Twilio-Python code for SMS interface for Synapse App
requirements.txt - python library requirements

# Implementation Details
The sms interface currently uses the python library geopy to both geolocate the user from
an approximate street/city address and then find the distance between the user and events.
Twilio is an api that allows us to send and receive sms messages. 

# Deployment
## Creating a Twilio Account
The first step to deploying ths SMS wrapper is to create your own Twilio account.
Create the account [here](https://www.twilio.com/) and activate a phone number that is SMS compatible.
Finally copy and paste the account SID and the authToken into the appropriate places
in smsInterface.py and app.json.

## Deploy on Heroku
Next, you'll want to create a Heroku account if you don't already have one. You can find instructions
for doin that [here](https://heroku.com). Once you've made an account you can deploy the application using
instructions found [here](https://devcenter.heroku.com/articles/getting-started-with-python#introduction).

## Connecting Twilio
Finally you'll want your new Twilio phone number to connect to your Heroku app! To do this 
go to the settings page of your Heroku app, copy the app's domain, and paste it into the messaging webhook
slot in your Twilio phone number's settings.

# Example Usage
User: Is there any water near me?

Synapse: Hello, welcome to Synapse. To begin, please enter yourapproximate address in the following format: Location: 1177 Waverley Street, Palo Alto, CA

User: Location: 1177 Waverely Street, Palo Alto, CA

Synapse:  I've located you at the following coordinates (37.442037, -122.151841). What can I help you with?

User: Is there any water near me?

Synapse: There are 3 events about water near you.


