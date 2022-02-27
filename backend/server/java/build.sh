#!/bin/bash
javac -d . JavaCompiler.java
javac -cp ./javax.json-1.1.4.jar -d . APIWrapper.java
javac -cp ./javax.json-1.1.4.jar -d . JavaCallWrapper.java

jar cfm monkshu.jar Manifest.txt org
rm -rf ./org