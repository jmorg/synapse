# Synapse Platform 2017

import os
from requests import get, post
import logging

from flask import Flask, request, redirect, session
import twilio.twiml
from geopy.distance import vincenty
from geopy.geocoders import googlev3


account_sid = "INSERT YOUR SID HERE"
authToken = "INSERT YOUR AUTH TOKEN HERE"

synapse_endpoint = "INSERT SYNAPSE ENDPOINT URL HERE"
request_dict = {"events": "event/info/all", "reports" : "report/info/all"}

MAX_DISTANCE = 10
app = Flask(__name__)


def get_num_events(data, event_type, user_lat, user_long):
	"""
	This function gets the number of events of a certain event_type near a user
	
	:param data (list): List of Synapse Event objects that are python dicts
	:param event_type (str): The event type of interest
	:param user_lat (float): The latitude of the user
	:param user_long (float): The longitude of the user
	:return (list): A list of events of the target event type and near the user
	"""
	event_list = []
	
	for i in range(len(data)):
		event_lat = data[i]['location_lat']
		event_long = data[i]['location_long']
		logging.info("event latitude: %f, event longitude: %f"%(event_lat, event_long))
		distance = vincenty((event_lat, event_long), (user_lat, user_long)).miles
		if data[i]['category'] == event_type and distance < MAX_DISTANCE: 
			event_list.append((data[i]['location_lat'], data[i]['location_long'],data[i]['current_score']))
			
	return event_list

def get_event_type(message):
	"""
	This function uses a keywords to determine the event type the user is interested in.
	
	:param message (str): The sms message sent by the user
	:return (str): The event type the user is interested in
	"""
	message = message.lower()
	if message.startswith("location"): return "location"
	elif "water" in message: return "Water"
	elif "power" in message: return "Power Outage"
	elif "food" in message: return "Food"
	elif "road" in message: return "Roadblock"
	elif "hospital" in message: return "Hospital"
	else: return "Gas"

def get_coordinates(message):
	"""
	This function translates a user's supplied street address to gps coordinates.
	
	:param message (str): The sms message containing the user's street address
	:return (tuple): Latitude and longitude of the user 
	"""
	address = message.split(":")[1].strip()
	geolocator = googlev3.GoogleV3()
	location = geolocator.geocode(address)
	logging.info("Located user at lat: {}, long: {}".format(location.latitude, location.longitude))
	return (location.latitude, location.longitude)

@app.route("/", methods=['GET', 'POST'])
def simpleResponse():
	"""
	This function contains the main logic for the Synapse SMS wrapper. Users send sms messages to
	the Synapse SMS number and Twilio forwards these messages to this endpoint. A user can input
	his/her street address to give Synapse their gps coordinates and then can query for event
	types near them.

	:return (Twilio message): Returns a sms message indicating the number, location, and score of
	events near a user.
	"""
	message = request.values.get('Body', None)
	if message is None:
		logging.error("There is no message in the request")
		return
	logging.info("The message received: {}".format(message))
	event_type = get_event_type(message)
	logging.info("the event_type of the request: {}".format(event_type))
	data = get(synapse_endpoint + request_dict['events']).json()['data']
	resp = twilio.twiml.Response()
	location = session.get('location', "Unknown")
	print(location)
	if event_type == "location":
		latitude, longitude = get_coordinates(message)
		location = (latitude, longitude)
		session['location'] = location
		resp.message("I've located you at the following coordinates (%f, %f). What can I help you with?"%(latitude, longitude))
	elif location == "Unknown":
		resp.message("Hello, welcome to Synapse. To begin, please enter your "
		"approximate address in the following format: \"Location: 123 Main Street, San Francisco, CA\"")
	else:
		event_list = get_num_events(data, event_type, location[0], location[1])
		message = "There are %d events about %s near you.\n"%(len(event_list), event_type)
		for index, (lat, long, score) in enumerate(event_list):
			message += "%d: Location: (%f, %f) Score: (%f) \n"%(index + 1, lat, long, score) 
		resp.message(message)
	return str(resp)

if __name__ == "__main__":
	app.secret_key = 'secretkey'
	port = int(os.environ.get('PORT', 5000))
	app.run(host='0.0.0.0', port=port)

