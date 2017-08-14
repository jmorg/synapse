drop table if exists SynapseUser;
drop table if exists Report;
drop table if exists Event;
drop table if exists EventVote;

create table SynapseUser(
user_id varchar(50) PRIMARY KEY,
home_lat double,
home_long double
);

create table Event(
event_id int PRIMARY KEY,
category varchar(30),
radius double,
current_score double,
last_verify_score double,
time varchar(200),
last_verify_time varchar(200),
location_lat double,
location_long double,
type varchar(30),
description varchar(140),
cost bool
);

create table Report(
report_id int PRIMARY KEY,
event_id int,
user_id varchar(50),
category varchar(200),
location_lat double,
location_long double,
event_time varchar(200),
type varchar(30),
description varchar(140),
cost bool,
FOREIGN KEY (event_id) REFERENCES Event(event_id)
	ON DELETE CASCADE,
FOREIGN KEY (user_id) REFERENCES SynapseUser(user_id)
);

create table EventVote(
vote varchar(30),
time varchar(200),
event_id int,
user_id varchar(50),
location_lat double,
location_long double,
FOREIGN KEY (event_id) REFERENCES Event(event_id)
	ON DELETE CASCADE,
FOREIGN KEY (user_id) REFERENCES SynapseUser(user_id)
);
