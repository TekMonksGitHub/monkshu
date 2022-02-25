package org.monkshu.java;

import java.util.*;
import java.io.File;
import javax.tools.*;
import java.nio.file.Paths;

public class JavaCompiler {
    public static boolean compile(String pathToJava, String classpath) {
        javax.tools.JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String parentJavaPath = Paths.get(pathToJava).getParent().toAbsolutePath().toString();
        List<String> options = new ArrayList<String>(Arrays.asList("-classpath", classpath, "-d", 
            parentJavaPath));
        StandardJavaFileManager fileManager = javac.getStandardFileManager(null, null, null);

        List<File> listOfFileToCompile = Arrays.asList(new File(pathToJava));
        Iterable<? extends JavaFileObject> compilationUnits = fileManager.getJavaFileObjectsFromFiles(listOfFileToCompile);
        javax.tools.JavaCompiler.CompilationTask compileTask = javac.getTask(null, null, null, options, null, compilationUnits);
        return compileTask.call();
    }

    public static void main(String[] args) {
        if (args.length < 2) {
            System.out.println("Usage: JavaCompiler <classpath> <Java file>");
            System.exit(1);
        } 
        
        if (compile(args[1], args[0])) {System.out.println("Done."); System.exit(0);}
        else {System.out.println("Compile failed."); System.exit(1); }
    }
}