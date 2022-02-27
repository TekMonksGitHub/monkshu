/**
 * Example API which embeds a call to Java logic
 * from inside its code. 
 * (C) 2022 TekMonks. All rights reserved.
 * License: See the enclosed LICENSE file.
 */
const calljava = require(`${CONSTANTS.LIBDIR}/calljava.js`);

const JAVA_CLASS = "org.monkshu.examples.java.ExampleCallJava", codePath = `${CONSTANTS.JAVADIR}/ExampleCallJava.java`;

exports.doService = async (jsonReq, _servObject, _headers, _url, _apiconf) => {
    const response = await calljava.execute(JAVA_CLASS, {...jsonReq, injected: "Injected value"}, codePath);
    return response;
}