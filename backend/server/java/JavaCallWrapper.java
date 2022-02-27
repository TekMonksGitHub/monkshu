package org.monkshu.java;

import javax.json.*;
import java.io.StringReader;
import java.lang.reflect.Method;

public class JavaCallWrapper {
    public String execute(String javaClass, String jsonInput) 
            throws Exception {
                
        JsonObject objInput = Json.createReader(new StringReader(jsonInput)).readObject();

        Object objToCall = Class.forName(javaClass).newInstance();
        Method executeMethod = objToCall.getClass().getMethod("execute", JsonObject.class);
        JsonObject result = (JsonObject)executeMethod.invoke(objToCall, objInput);
        return result.toString();
    }
}