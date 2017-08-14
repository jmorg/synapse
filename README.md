# synapse-code


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
