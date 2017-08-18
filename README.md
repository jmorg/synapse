# Synapse


Synapse is a platform designed to crowdsource, verify, and redistribute information in the aftermath of disaster. It has 3 components: a mobile application, a web app, and an sms service. It was developed as part of Stanford's [CS210](http://web.stanford.edu/class/cs210/) and won the Department Award for Best Senior Project in 2017.

Here's what users can do with Synapse:

* Reporting infrastructure changes, aid stations, and more with geolocation and short descriptions
* Verifying or disputing other users reports
* Getting real time, adjusted accuracy scores for existing reports
* Queue actions offline, so that they fire off when network connection is refreshed
* Cache maps of locations ahead of time to be prepared for and save data in a disaster scenario
* An admin overview of the situation with additional functionality from our web app
* Getting vital information from approved organizations in app

We strive to make all of these features consumer as little data as possible while being robust.

Here are some of the features that are currently in development:

* Plugging in approved organizations to our web app, which includes reporting that gives a perfect accuracy score and the ability to post to users' newsfeed
* Photo uploads and photo downloads on request
* Continued advancement of our real time verification model
* Adding emergency cards with contact info based on current location
* Keeping track of friends and family in a disaster so you can assure they're safe

You can take a look at some of our tech stack [here](http://www.infoworld.com/article/3215148/mobile-development/build-an-app-with-flask-and-oracle-mobile-cloud-service.html) and read about our story [here](www.teamsynapse.wordpress.com) and we'd love it if you made a pull request! Synapse is a great project for people looking to use CS for social good or to tackle difficult problems that are unique to disaster scenarios, and we're always looking for new contributors. 

Style Guide:
### Git Etiquette
The synapse-code repo maintains a master branch (production-ready code),
a develop branch (code in development), and feature branches. To write a new feature,
create a new branch off of develop with the name "ISSUENUMBER_SHORTDESCRIPTION". The first
feature branch, for example, is named "1_basic_db". Then commit your code to that branch
with the message "[ISSUENUMBER] SHORTDESCRIPTION". The first commit, for example, is named
"[1] Build basic DB for local deployment", where "1" is the issue number the commit corresponds to.

If an issue is too large to be encapsulated into one commit, then create subtasks for that issue
and use the number for that subtask. A commit is ideally 50 lines of code, but really is 1 feature, and only one feature.

Make a new branch for every task, and when completed, a pull request from that branch into the major task branch it is a part of. 
Then request a code review.

Anytime you finish something, commit and push so that everything is up to date.

### Code Reviews
When code is going to checked in, it needs to be reviewed. This means another peer examines 
your code, comments with suggestions, and you respond to them. Their approval means you can merge.
* A good turnaround time is less than a day
* Try and submit code that is the smallest possible to do the feature you're creating

### Testing
* Tests are your friend. Write tests. Write tests first. It'll will help you write better code.
* Methods should have unit tests, and processes should have integration tests.
* [Test Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)

### Tabs and Spacing
* Use 4-space Tabs in your editor

### Comments
* Every method should have a comment
* Comment as needed outside of this - but try and write code that doesn't require comments!
..* Code that can be expressed in code, is good code.

### Methods and Control Statements
* No space between name and parenthesis
* Space between ) and {
```C++
function foo(int arg) {
    return arg++;
}
```
* Bracket on same line
* Control statements:

```C++
if (something) {
     //do something     
 } else {
     // do something else     
 }
```
 
### Constants
* Use constants for any magic number
* Make constants names very clearly describe what they are and where they come from
