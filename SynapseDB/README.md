# SynapseDB
## Setup ##
Ensure that MySQL Community Server is installed on your machine,
and give it a password "test".

## Initializing the Database ##
Run the command "./createDatabase.sh", which will create your database.

## Querying the Database ##
There are currently 4 tables: SynapseUser, Report, Event, and EventVote.
To query these tables, type: "mysql -ptest", which will open up the mysql
shell, then type "use SynapseDB" to select the SynapseDB database.

Enter mysql queries to query the DB!
