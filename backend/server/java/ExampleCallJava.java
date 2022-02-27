package org.monkshu.examples.java;

import javax.json.*;

public class ExampleCallJava {
    public JsonObject execute(JsonObject jsonInput) {
        JsonObject result = Json.createObjectBuilder().add("result", Boolean.TRUE).add("request", jsonInput.toString()).build();
        return result;
    }
}