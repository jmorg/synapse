# Synapse Backend README

# Set-up
* Run "./createDatabase.sh" in SynapseDB folder
* Return to SynapseBackend and run the following commands:
```
> virtualenv rest-api
> source rest-api/bin/activate
> pip install flask
> pip install flask-restful
> pip install sqlalchemy
> pip install MySQL-python
```
It is recommended to create an alias (found in vm .bashrc already as run_backend. Use in SynapseBackend)

# Run Backend
To run locally for testing:
```sh
$ python synapseApi.py
```
Publicly:
```sh
$ flask run --host=0.0.0.0
```

For more info on deplopyment, see (here)[http://flask.pocoo.org/docs/0.12/deploying/#deployment]

# Functionality
| Description | Endpoint |
| ------ | ------ |
| (GET) Endpoint for viewing all user information | '/user/info/all' |
| (GET) Endpoint for viewing user information by ID| '/user/info/<int:event_id>' |
| (GET) Endpoint for viewing all report information | '/report/info/all' |
| (GET) Endpoint for viewing report information by ID| '/report/info/<int:event_id>' |
| (POST) Endpoint for adding new report | '/report/add/' |
| (GET) Endpoint for viewing all event information | '/event/info/all' |
| (GET) Endpoint for viewing event information by ID | '/revent/info/<int:report_id>' |
| (POST) Endpoint for verifying event | '/event/verify/' |
| (POST) Endpoint for disputing event | '/event/dispute/' |

# Unit-Tests
* In SynapseBackend and run the following commands:
```
> virtualenv rest-api
> source rest-api/bin/activate
> pip install flask
> pip install flask-restful
> pip install sqlalchemy
> pip install flask_testing
```

# Run Unit-Tests
```sh
$ python synapseApi.py
```
# Merge Event Utility
* The file utility.py provides functionality for merging events in the event table.
* The current criteria for merging events is a distance threshold in miles
* Distance between two GPS coordinates is calculated using the geopy library, which leverages Google's Geocoding API
* Example Usage: 
```
from utility import doMergeJob
doMergeJob('Food') #merges all Food events and updates the database
```

