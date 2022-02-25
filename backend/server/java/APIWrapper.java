package org.monkshu.java;

import javax.json.*;
import java.io.StringReader;
import java.lang.reflect.Method;

public class APIWrapper {
    public String doService(String apiClass, String jsonReq, String jsonHeaders, String url, String jsonAPIConf) 
            throws Exception {
                
        JsonObject objReq = Json.createReader(new StringReader(jsonReq)).readObject();
        JsonObject objHeaders = Json.createReader(new StringReader(jsonHeaders)).readObject();
        JsonObject objAPIConf = Json.createReader(new StringReader(jsonAPIConf)).readObject();

        Object objAPI = Class.forName(apiClass).newInstance();
        Method doServiceMethod = objAPI.getClass().getMethod("doService", JsonObject.class, JsonObject.class, 
            String.class, JsonObject.class);
        JsonObject result = (JsonObject)doServiceMethod.invoke(objAPI, objReq, objHeaders, url, objAPIConf);
        return result.toString();
    }
}