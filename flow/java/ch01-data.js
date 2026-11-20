/* FLOW · Java · Chapter 1 — The Toaster Problem
   Why the JVM exists, and the full journey of `java Hello`. */
window.FLOW_CHAPTER = {
  id: "java-01",
  home: "../",
  acts: [
    { name: "I · The Toaster Problem", from: 0 },
    { name: "II · The Package", from: 6 },
    { name: "III · The Awakening", from: 10 },
    { name: "IV · Hot Spots", from: 15 },
    { name: "Landing", from: 18 }
  ],

  beats: [
    /* 0 */ {
      type: "title",
      kicker: "FLOW · Java · Chapter 1",
      h1: "The Toaster Problem",
      sub: "How a language built for TV remotes ended up running banks and Minecraft. And what <em>really</em> happens in the half-second after you type <code>java Hello</code>.",
      whisper: "Questions will interrupt you without warning, with an hourglass running. That's the design. Press Space or tap Begin."
    },
    /* 1 */ {
      kicker: "1991 · Menlo Park, California",
      h: "A small team quietly leaves Sun Microsystems.",
      p: [
        "Sun was a workstation giant. But a few of its engineers, among them <b>James Gosling</b>, <b>Patrick Naughton</b> and <b>Mike Sheridan</b>, had a hunch: the next wave of computing wouldn't sit on desks. It would hide inside TVs, set-top boxes, even toasters.",
        "Sun moved them into a separate office, away from the main company, to think freely. Codename: <b>the Green Project</b>."
      ],
      reveal: { q: "So what's the problem with toasters?", a: "Every device maker used a different chip. And a chip understands only its own machine language." },
      q: "warm"
    },
    /* 2 */ {
      h: "One program. Fifty chips. Fifty nightmares.",
      p: [
        "Writing software for a device in 1991 meant compiling C or C++ for <b>that exact chip</b>. New chip? Recompile. Retest. Ship again.",
        "And C++ was fragile. Memory bugs crashed programs. A crash on a desktop is annoying. A crash inside a sealed set-top box means someone has to come and fix it.",
        "Gosling got tired of fighting C++ and started writing a new language. He named it after the tree outside his office window: <b>Oak</b>."
      ]
    },
    /* 3 */ {
      kicker: "The big idea",
      h: "Compile for a chip that doesn't exist.",
      p: [
        "Instead of targeting a real processor, Oak compiled to instructions for an <b>imaginary one</b>: a clean, simple, made-up machine.",
        "Then, on every real device, you run one small program whose only job is to <b>pretend to be that imaginary chip</b>."
      ],
      aside: "🎼 Think of sheet music. A composer writes the notes once. Any pianist can play them on whatever piano is in front of them, a grand or a harmonium. The notes never change; the player adapts.",
      reveal: { q: "What are the pretend chip and its language called?", a: "The pretend chip is a <b>virtual machine</b>. Its language is <b>bytecode</b>. Java's version: the JVM." },
      q: "vm"
    },
    /* 4 */ {
      kicker: "1992 → 1995",
      h: "They built a remote control. Nobody bought it.",
      p: [
        "In 1992 the team demoed <b>*7 (\"Star Seven\")</b>, a handheld touchscreen controller with a little animated helper named <b>Duke</b>. Impressive. Then they lost the interactive-TV deal they'd bet on.",
        "Meanwhile, something else exploded: <b>the web</b>. Millions of people on every kind of computer, all downloading the same files.",
        "A language whose programs run unchanged on any machine? The web needed exactly that."
      ],
      reveal: { q: "Why isn't it called Oak today?", a: "\"Oak\" was already trademarked. After a naming brainstorm they picked <b>Java</b>, after the coffee. Sun launched it in May 1995 with a slogan you still hear: <b>Write once, run anywhere.</b>" }
    },
    /* 5 */ {
      kicker: "The map",
      h: "The journey your code takes every time it runs.",
      p: ["Tap play. Every stop on this map is a scene in this chapter, and each one hides a trap."],
      widget: {
        type: "pipeline",
        nodes: [
          { i: "📝", t: "Hello.java", s: "your source" },
          { i: "🔧", t: "javac", s: "the compiler" },
          { i: "📦", t: ".class", s: "bytecode" },
          { i: "🚀", t: "java", s: "the launcher" },
          { i: "🧠", t: "JVM", s: "load · verify · run" },
          { i: "⚡", t: "CPU", s: "real machine code" }
        ]
      }
    },

    /* ---------- Act II · The Package ---------- */
    /* 6 */ {
      kicker: "Stop 1 · javac",
      h: "You write this. Then you compile it.",
      code: {
        file: "Hello.java",
        src: `public class Hello {
    public static void main(String[] args) {
        System.out.println(new Greeter().hi());
    }
}

class Greeter {
    String hi() { return "Hello"; }
}`
      },
      after: ["<code>javac Hello.java</code> reads your source and writes bytecode. Simple, right? Look closely. There's already a trap in this file."],
      q: "twoclass"
    },
    /* 7 */ {
      kicker: "Stop 2 · the package",
      h: "A .class file isn't text. It's raw bytes.",
      p: [
        "Open <code>Hello.class</code> in a text editor and you'll see garbage. Open it in a hex viewer and you see the truth: a precise binary format, byte by byte.",
        "Every format has a fingerprint. Before the JVM trusts a file, it checks the very first bytes."
      ],
      q: "cafe"
    },
    /* 8 */ {
      kicker: "Stop 2 · inside Hello.class",
      h: "The first bytes of a real class file.",
      p: ["Tap each group of bytes."],
      widget: {
        type: "hex",
        prompt: "👆 Tap a byte group to decode it.",
        groups: [
          { b: "CA FE BA BE", l: "<b>The magic number.</b> If a file doesn't start with these 4 bytes, the JVM refuses it with <code>ClassFormatError</code>." },
          { b: "00 00", l: "<b>Minor version.</b> Almost always 0 (except when preview features are on)." },
          { b: "00 41", l: "<b>Major version.</b> 0x41 = <b>65</b> = compiled by Java 21. The rule: <b>Java version + 44</b>. Java 8 → 52, Java 17 → 61. Hold that thought…" },
          { b: "00 1D", l: "<b>Constant pool count.</b> The class's table of names, strings and numbers: \"Hello\", \"println\", \"java/lang/String\"… Bytecode refers to these by index." },
          { b: "0A 00 02 00 03 …", l: "<b>Constant pool entries begin.</b> Then come the access flags, the class name, the superclass, fields, methods, and finally the bytecode itself." }
        ]
      },
      q: "version"
    },
    /* 9 */ {
      kicker: "Stop 3 · the bytecode itself",
      h: "Bytecode does math without registers.",
      p: ["Inside <code>main</code> you write <code>int a = 2; int b = 3; int c = a + b;</code>. Here's what javac actually produces. Step through it."],
      widget: {
        type: "stepper",
        slots: ["args", "a", "b", "c"],
        intro: "Slot 0 already holds <b>args</b>, because <code>main</code> is static, so there's no <code>this</code>. Press <b>Step</b>.",
        outro: "<br><b>Notice:</b> not one instruction named a register. Everything went through the stack.",
        code: [
          { op: "iconst_2", note: "<b>iconst_2</b>: push the constant 2 onto the stack." },
          { op: "istore_1", note: "<b>istore_1</b>: pop the top value into local slot 1. That's <code>a</code>." },
          { op: "iconst_3", note: "<b>iconst_3</b>: push 3." },
          { op: "istore_2", note: "<b>istore_2</b>: pop it into slot 2. That's <code>b</code>." },
          { op: "iload_1", note: "<b>iload_1</b>: copy <code>a</code> back onto the stack." },
          { op: "iload_2", note: "<b>iload_2</b>: copy <code>b</code> on top of it." },
          { op: "iadd", note: "<b>iadd</b>: pop two, add, push the result. One byte. No operands needed: it always uses the top of the stack." },
          { op: "istore_3", note: "<b>istore_3</b>: pop 5 into slot 3. That's <code>c</code>." }
        ]
      },
      q: "stack"
    },

    /* ---------- Act III · The Awakening ---------- */
    /* 10 */ {
      kicker: "Stop 4 · java Hello",
      h: "You type java Hello. A machine is born.",
      p: [
        "<code>java</code> is a small native program, the launcher. Its first job: start the JVM, a process that will impersonate that imaginary 1991 chip.",
        "But a fresh JVM knows <b>nothing</b>. Not your classes. Not even <code>String</code>. Someone has to fetch every class it needs."
      ],
      reveal: { q: "Who does the fetching?", a: "<b>Class loaders</b>, a chain of three. <b>Bootstrap</b> loads core Java and is built into the JVM itself. <b>Platform</b> loads the extra JDK modules. <b>Application</b> loads your code from the classpath." },
      q: "javaclass"
    },
    /* 11 */ {
      kicker: "Stop 4 · the chain of command",
      h: "Ask your parent first. Always.",
      p: [
        "When the JVM needs a class, the Application loader doesn't search first. It <b>asks its parent</b>. The parent asks <b>its</b> parent. Only when the top says \"not mine\" does the search come back down.",
        "It sounds bureaucratic. It's actually the lock on Java's front door."
      ],
      aside: "🏦 Like a bank: for anything that touches the vault, the junior clerk always checks with head office first, even when the clerk could handle it alone.",
      q: "string"
    },
    /* 12 */ {
      kicker: "Stop 5 · the bouncer",
      h: "Trust no bytes.",
      p: [
        "Loaded bytes could have come from anywhere: an applet downloaded in 1995, a hacker's hex editor, a code generator. <b>javac isn't in the room anymore.</b>",
        "So before a single instruction runs, the <b>verifier</b> inspects every method. Are the types on the stack consistent? Can the stack underflow? Does every jump land on a real instruction?"
      ],
      q: "verify"
    },
    /* 13 */ {
      kicker: "Stop 6 · lazy by design",
      h: "The JVM only loads what it touches.",
      code: {
        file: "App.java",
        src: `public class App {
    public static void main(String[] args) {
        if (args.length > 99) {
            new Rare().run();
        }
        System.out.println("done");
    }
}`
      },
      after: ["Read it once. Then hold that thought."],
      q: "lazy"
    },
    /* 14 */ {
      kicker: "Stop 7 · main",
      h: "Why main has those strange words.",
      p: [
        "<code>public</code>: the launcher lives outside your class, so it has to be able to see the method.",
        "<code>void</code>: nobody receives a return value. Exit codes go through <code>System.exit(n)</code>.",
        "<code>String[] args</code>: the words you type after the class name on the command line.",
        "And <code>static</code>… that's the interesting one."
      ],
      q: "static"
    },

    /* ---------- Act IV · Hot Spots ---------- */
    /* 15 */ {
      kicker: "Stop 8 · speed",
      h: "The JVM starts slow, on purpose.",
      p: [
        "Reading bytecode one instruction at a time (interpreting) is slow. Early Java earned a reputation that still follows it around: <b>\"Java is slow.\"</b>",
        "Around 1999–2000 Sun shipped <b>HotSpot</b>. The idea is in the name: find the <b>hot spots</b>, the code that runs constantly, and compile only those into real machine code <b>while the program is running</b>.",
        "A compiler that works mid-flight is called a <b>JIT</b>: Just-In-Time."
      ],
      q: "jit"
    },
    /* 16 */ {
      kicker: "Stop 8 · mid-flight",
      h: "What if the hot code is still running?",
      p: [
        "A loop has been spinning in the interpreter for a while. The JVM notices: this is hot. It compiles the loop.",
        "But the loop isn't finished. It's <b>still running</b>, in slow mode. What now?"
      ],
      q: "loop"
    },
    /* 17 */ {
      kicker: "Stop 9 · the last secret",
      h: "Java's best invention might not be Java.",
      p: [
        "Sun set out to build a language. Thirty years later, look at what's still standing, being rebuilt and copied, and running code from people who never write Java at all.",
        "One question before you land."
      ],
      q: "lang"
    },
    /* 18 */ { type: "landing" }
  ],

  /* ======================= QUESTIONS ======================= */
  questions: {
    warm: {
      id: "warm", warm: true, fast: false,
      stem: "A C program is compiled into machine code for an Intel x86 chip. You copy that file onto a device with a Motorola 68000 chip and run it. What happens?",
      opts: [
        "It runs, just slower",
        "It runs normally. Machine code is machine code",
        "It doesn't run: the chip can't understand those instructions",
        "The operating system translates it automatically"
      ],
      ans: 2,
      layers: [
        { t: "Machine code is a chip's private vocabulary", h: "<p>x86 and 68000 have completely different <b>instruction sets</b>. The same byte that means \"add\" on one chip might mean \"jump\" on the other, or nothing at all. To the wrong chip the file is noise.</p>" },
        { t: "Multiply that by every device", h: "<p>In 1991, shipping one program to 50 kinds of devices meant 50 compilations and 50 test cycles. Even C's <code>int</code> was a different size on different compilers. That pain is the whole reason Java exists.</p>" },
        { t: "The option that's half true today", h: "<p>\"The OS translates it\" sounds wrong, but today it exists in special cases: Apple's <b>Rosetta 2</b> translates x86 apps into ARM code on Apple Silicon Macs. It's a heavy, purpose-built translator Apple wrote for one chip pair, not something chips or operating systems do for free. Java's answer was cheaper: never ship real machine code at all.</p>" }
      ]
    },
    vm: {
      id: "vm", pre: true,
      stem: "\"Write once, run anywhere.\" But <b>something</b> still has to be built separately for every OS + chip combination. What?",
      opts: ["Your .class files", "The output of the Java compiler", "The JVM itself", "Nothing. That's the whole point"],
      ans: 2,
      layers: [
        { t: "Portability moved. It didn't vanish.", h: "<p>The JVM is a <b>native program</b>: there's one build for Windows on x64, another for Linux on ARM, another for macOS on Apple Silicon. Your bytecode is portable only because someone else did the non-portable work.</p>" },
        { t: "The economics of leverage", h: "<p>That's the deal. A handful of JVM makers (Oracle, Eclipse Temurin, Amazon Corretto, Azul…) pay the porting cost once per platform. Millions of developers never pay it. One hard problem, solved once, for everyone.</p>" },
        { t: "\"Write once, debug everywhere\"", h: "<p>The 90s joke had a point: early JVMs differed in threading, fonts and GUI behaviour, so the same program could <i>behave</i> differently. Portable logic isn't the same as portable behaviour. Keep that distinction in your head; it applies to Docker, browsers and cloud too.</p>" }
      ]
    },
    twoclass: {
      id: "twoclass",
      stem: "You run <code>javac Hello.java</code> on this file. What appears on disk?",
      code: { file: "Hello.java", src: `public class Hello {
    public static void main(String[] args) {
        System.out.println(new Greeter().hi());
    }
}
class Greeter {
    String hi() { return "Hello"; }
}` },
      opts: [
        "Only Hello.class. Greeter is packed inside it",
        "Hello.class and Greeter.class",
        "Hello.jar",
        "Compile error: only one class per file"
      ],
      ans: 1,
      layers: [
        { t: "One class, one .class file. Always.", h: "<p>The unit of bytecode is the <b>class</b>, not the source file. Two top-level classes means two class files, named after the classes.</p>" },
        { t: "It goes further than you think", h: "<p>An inner class <code>Outer.Inner</code> becomes <code>Outer$Inner.class</code>. Anonymous classes become <code>Outer$1.class</code>, <code>Outer$2.class</code>… Lambdas are the odd ones out: they usually leave <b>no file on disk</b>, because the JVM spins them up at runtime through an instruction called <code>invokedynamic</code>.</p>" },
        { t: "Why design it this way?", h: "<p>The JVM loads classes <b>one at a time, lazily, from anywhere</b>: disk, a JAR, the network, or memory. One file per class lets it fetch exactly what it needs and nothing more. In 1995, with applets downloading over 28.8k modems, that mattered a lot.</p>" }
      ]
    },
    cafe: {
      id: "cafe", pre: true, fast: true,
      stem: "Every valid .class file on Earth starts with the same 4 bytes. Which ones?",
      opts: ["4A 41 56 41 (ASCII for \"JAVA\")", "CA FE BA BE", "7F 45 4C 46", "00 00 00 00"],
      ans: 1,
      okLine: "Yes. CAFEBABE.",
      layers: [
        { t: "The magic number", h: "<p>The JVM checks these 4 bytes first. Anything else fails fast with <code>ClassFormatError: Incompatible magic value</code>. It's a cheap way to reject the wrong file before doing any real work.</p>" },
        { t: "The decoy was real too", h: "<p><code>7F 45 4C 46</code> is <code>\\x7FELF</code>, the fingerprint of every Linux executable. PDFs start with <code>%PDF</code>, PNGs with <code>\\x89PNG</code>. Magic numbers are everywhere once you start looking.</p>" },
        { t: "Why CAFEBABE?", h: "<p>Gosling has told the story: the team used to joke about a lunch spot they called \"Cafe Dead\". He needed two magic numbers, used <code>CAFEDEAD</code> for one format, then searched for another 4-letter hex word to follow CAFE and found <code>BABE</code>. Thirty years later it sits at the start of billions of files.</p>" }
      ]
    },
    version: {
      id: "version",
      stem: "You compile with <b>JDK 21</b> and hand the .class to a server running <b>Java 17</b>. What happens?",
      opts: [
        "Runs fine. Bytecode is portable",
        "Runs, but Java 21 features are silently disabled",
        "UnsupportedClassVersionError before any of your code runs",
        "The JVM auto-downloads Java 21"
      ],
      ans: 2,
      layers: [
        { t: "The version byte you just tapped", h: "<p>Major version 65 (Java 21) is newer than anything Java 17 knows (61). It refuses: <code>class file version 65.0, this version of the Java Runtime only recognizes class file versions up to 61.0</code>.</p>" },
        { t: "Portable across space, not forward in time", h: "<p>Old → new works: Java 8 classes run on Java 21. New → old fails, because newer bytecode can use instructions and attributes the old JVM has never heard of. \"Run anywhere\" never meant \"run any <i>when</i>\".</p>" },
        { t: "The fix, and the trap inside the fix", h: "<p>Use <code>javac --release 17</code>. It writes version 61 <b>and</b> checks you only used Java 17 APIs. The older <code>-source 17 -target 17</code> sets the version but compiles against Java 21's library, so you can call a method that doesn't exist on 17. That compiles fine, then blows up in production with <code>NoSuchMethodError</code>.</p>" }
      ]
    },
    stack: {
      id: "stack",
      stem: "Bytecode does all its math on a stack and never names a CPU register. Why would Java's designers choose the slower-sounding design?",
      opts: [
        "Stacks are faster than registers",
        "Real CPUs all have different numbers of registers. A stack assumes none",
        "Registers hadn't been invented yet",
        "To make bytecode harder to reverse-engineer"
      ],
      ans: 1,
      layers: [
        { t: "Assume nothing about the hardware", h: "<p>32-bit x86 had 8 general-purpose registers; other chips had 16 or 32. If bytecode said \"use register 12\", a chip with 8 would be stuck. A stack machine makes zero assumptions, which is exactly what an imaginary chip needs.</p>" },
        { t: "Bonus: tiny code", h: "<p><code>iadd</code> is <b>one byte</b>. It needs no operands because they're always the top of the stack. Compact bytecode meant small downloads, which mattered on the 1995 web.</p>" },
        { t: "Plot twist: the stack is mostly fiction", h: "<p>At runtime, the JIT compiler turns stack operations back into register operations for your real CPU. The stack is a <b>portable description</b> of the computation, not how it finally executes. Android went the other way: its Dalvik/ART bytecode is register-based. Both designs work.</p>" }
      ]
    },
    javaclass: {
      id: "javaclass",
      stem: "You run <code>javac Hello.java</code>, then <code>java Hello.class</code>. What happens?",
      opts: [
        "Prints Hello. You just named the file explicitly",
        "Error: Could not find or load main class Hello.class",
        "It recompiles and then runs",
        "It runs, with a warning"
      ],
      ans: 1,
      layers: [
        { t: "java takes a class name, not a file name", h: "<p>The launcher reads <code>Hello.class</code> as a <b>fully qualified class name</b>: a class called <code>class</code> inside a package called <code>Hello</code>. It goes looking for <code>Hello/class.class</code>, finds nothing, and fails.</p>" },
        { t: "Dots are package separators", h: "<p><code>java com.shop.Cart</code> means: find <code>com/shop/Cart.class</code> on the classpath. Packages map to folders. That's why the dot in the file name confused it.</p>" },
        { t: "Yet .java works!", h: "<p>Since Java 11, <code>java Hello.java</code> is legal: <b>source-file mode</b>. The launcher sees the <code>.java</code> ending, compiles the file in memory and runs it, with no .class file on disk. So the source file works and the compiled file doesn't. A beautiful trap.</p>" }
      ]
    },
    string: {
      id: "string",
      stem: "Suppose you manage to get your own <code>java.lang.String</code> class onto the classpath, ahead of everything else. Your program uses <code>String</code>. Whose String runs?",
      opts: [
        "Yours. First on the classpath wins",
        "Both, unpredictably",
        "The real one. The JVM asks its most trusted loader first",
        "The JVM crashes with a duplicate-class error"
      ],
      ans: 2,
      layers: [
        { t: "Parent-first delegation", h: "<p>The Application loader asks Platform, which asks Bootstrap. Bootstrap loads core classes from the JDK's <code>java.base</code> module, finds the real <code>String</code> first, and that's the end of it. Your file is never even opened.</p>" },
        { t: "Why it's a security wall", h: "<p>If apps could swap <code>String</code>, they could swap the class that carries passwords, file paths and URLs. Even a custom class loader that tries to define a class in <code>java.*</code> gets <code>SecurityException: Prohibited package name</code>.</p>" },
        { t: "Modern Java locks it twice", h: "<p>Since Java 9's module system, <code>javac</code> won't even compile it: <i>package exists in another module: java.base</i>. The only legal door is <code>--patch-module</code>, a deliberate, loud flag JDK developers use to test patches. (That's why the question said \"suppose you manage to\".)</p>" }
      ]
    },
    verify: {
      id: "verify",
      stem: "A hacker hand-edits a .class file so an <code>int</code> is used as an object reference (a pointer into memory). They run it. What happens?",
      opts: [
        "It runs. The hacker now reads raw memory",
        "The JVM crashes with a segmentation fault",
        "VerifyError: rejected before a single instruction runs",
        "javac catches it"
      ],
      ans: 2,
      layers: [
        { t: "The bouncer at the door", h: "<p>The verifier simulates the types flowing through every method. An int where a reference is expected? <code>VerifyError</code>, during linking, before execution. This is why plain Java code can't do pointer arithmetic, not even through crafted bytecode.</p>" },
        { t: "Why javac can't be the guard", h: "<p>Option 4 is the classic trap. javac never sees hand-edited bytes. The JVM can't know where bytecode came from: a compiler, a generator, a network or a hex editor. So it trusts the <b>code</b>, not the <b>compiler</b>.</p>" },
        { t: "The compiler shows its homework", h: "<p>Modern class files carry a <code>StackMapTable</code>: hints javac writes down about the types at key points in each method. The verifier then only has to <b>check</b> the hints in one linear pass instead of inferring everything. Checking a proof is cheaper than finding one, an idea that shows up across computer science.</p>" }
      ]
    },
    lazy: {
      id: "lazy",
      stem: "After compiling, you <b>delete Rare.class</b>. Then you run <code>java App</code> with no arguments. What happens?",
      code: { file: "App.java", src: `public class App {
    public static void main(String[] args) {
        if (args.length > 99) {
            new Rare().run();
        }
        System.out.println("done");
    }
}` },
      opts: [
        "NoClassDefFoundError at startup",
        "It prints \"done\"",
        "ClassNotFoundException at compile time",
        "The JVM regenerates Rare.class"
      ],
      ans: 1,
      layers: [
        { t: "Loaded on first use, not at startup", h: "<p>With no arguments, <code>args.length</code> is 0, so the branch never runs. The JVM never goes looking for <code>Rare.class</code>, so its absence never matters. Classes load <b>lazily</b>, the first time they're actually needed.</p>" },
        { t: "Watch it happen", h: "<p>Run <code>java -verbose:class App</code> and you'll see every class load in real time. Even Hello World pulls in <b>hundreds</b> of JDK classes. Laziness is the only reason a huge app with thousands of classes starts at all.</p>" },
        { t: "The fine print", h: "<p>If the branch <i>had</i> run, you'd get <code>NoClassDefFoundError</code>. That's an <b>Error</b>, not an Exception, meaning \"this existed at compile time and has vanished\". Subtlety: in some cases the verifier loads a class early to check type compatibility. Here it doesn't need to.</p>" }
      ]
    },
    static: {
      id: "static",
      stem: "On <b>Java 17</b>, you delete the word <code>static</code> from <code>public static void main(String[] args)</code>. What happens?",
      opts: [
        "Compile error",
        "Compiles fine, then fails at launch",
        "Runs normally",
        "Runs, but main executes twice"
      ],
      ans: 1,
      layers: [
        { t: "javac doesn't care. The launcher does.", h: "<p>To the compiler it's just an ordinary instance method that happens to be called <code>main</code>. Perfectly legal. At launch: <code>Error: Main method is not static in class Hello, please define the main method as: public static void main(String[] args)</code>.</p>" },
        { t: "Why static at all?", h: "<p>At startup <b>no objects exist</b>. To call an instance method you need an object, but creating one needs code to run first. Chicken and egg. <code>static</code> means \"callable on the class itself\", so the launcher can start without constructing anything.</p>" },
        { t: "Plot twist: the answer changed in 2025", h: "<p>Java 25 finalized <b>instance main methods and compact source files</b>. A complete program can now be <code>void main() { IO.println(\"Hello\"); }</code>, and the launcher creates the object for you. Same question, different answer depending on the version. That's why the question said Java 17. Always check versions.</p>" }
      ]
    },
    jit: {
      id: "jit",
      stem: "Why doesn't the JVM simply compile <b>all</b> bytecode to native machine code the moment your program starts?",
      opts: [
        "The specification forbids it",
        "Compiling everything wastes startup time, and waiting lets it compile smarter using what it observes",
        "Native code is slower than interpreting",
        "It does. Interpretation is a myth"
      ],
      ans: 1,
      layers: [
        { t: "Most code runs rarely", h: "<p>Compiling everything up front burns startup time on code that might run once. So HotSpot <b>interprets first</b>, counts method calls and loop iterations, and compiles only what proves itself hot.</p>" },
        { t: "The real superpower: it watches", h: "<p>After observing, the JIT knows things a traditional compiler can't: \"this <code>if</code> is never taken\", \"this interface call always lands on <code>ArrayList</code>\". It compiles code specialised for <b>what actually happens</b>, not for every possibility.</p>" },
        { t: "Bet, and take it back", h: "<p>Tiered compilation goes interpreter → <b>C1</b> (quick compile) → <b>C2</b> (slow, aggressive). If a bet goes wrong, say a new type suddenly shows up, the JVM <b>deoptimizes</b>: it throws away the native code, drops back to interpreting, and recompiles later. Ahead-of-time compilation does exist too (GraalVM native-image), trading that adaptability for instant startup.</p>" }
      ]
    },
    loop: {
      id: "loop",
      stem: "A loop inside <code>main</code> runs 10 million times. Roughly how does the 9,000,000th iteration execute?",
      opts: [
        "Interpreted, bytecode by bytecode, like the first",
        "As native machine code, compiled while the loop was still running",
        "Re-read from Hello.class on each iteration",
        "On the GPU"
      ],
      ans: 1,
      layers: [
        { t: "On-Stack Replacement (OSR)", h: "<p>The JVM compiles the hot loop, then <b>swaps the running interpreted frame for a compiled one</b>, mid-loop, carrying the current values of your variables across. It's like changing a car's engine at 100 km/h.</p>" },
        { t: "Why micro-benchmarks lie", h: "<p>The first iterations ran slow (interpreted), the later ones fast (compiled). Time the whole thing naively and you're measuring a blend. That's why serious tools like <b>JMH</b> run warm-up rounds before measuring.</p>" },
        { t: "The JIT can delete your benchmark", h: "<p>If the loop computes something that's never used, the JIT may remove it entirely (<b>dead code elimination</b>), and your benchmark ends up measuring nothing. JMH's <code>Blackhole</code> exists to \"consume\" results so the JIT can't throw them away.</p>" }
      ]
    },
    lang: {
      id: "lang",
      stem: "Which statement about the JVM is TRUE?",
      opts: [
        "It reads .java source files",
        "It understands only bytecode. It has no idea the Java language exists",
        "It can only run programs written in Java",
        "Kotlin needs its own separate virtual machine"
      ],
      ans: 1,
      layers: [
        { t: "The JVM speaks bytecode, period", h: "<p>The JVM specification describes class files, instructions, the stack and the verifier. It doesn't care what produced them. <b>Kotlin, Scala, Clojure, Groovy</b>: anything that emits valid bytecode gets the whole engine for free (garbage collector, JIT, threads, decades of tuning).</p>" },
        { t: "But… java Hello.java?", h: "<p>Source-file mode <i>looks</i> like the JVM reading source. In fact the <b>launcher</b> quietly runs the compiler in memory and hands bytecode to the JVM. The JVM still only ever saw bytecode.</p>" },
        { t: "The strategic lesson", h: "<p>Sun set out to build a language. The lasting asset turned out to be the <b>runtime</b>. Languages come and go; a platform with 30 years of optimization becomes ground other languages build on. Keep that pattern in mind: the most valuable layer is often the one underneath the thing people talk about.</p>" }
      ]
    },

    /* ---------- bonus pool (fires on streaks, or in the bonus round) ---------- */
    banana: {
      id: "banana",
      stem: "A file named <code>Banana.java</code> contains only this (note: not public). What happens with <code>javac Banana.java</code>?",
      code: { src: `class Apple {
    public static void main(String[] a) {
        System.out.println("hi");
    }
}` },
      opts: [
        "Compile error: the class name must match the file name",
        "It compiles to Banana.class",
        "It compiles to Apple.class, and java Apple prints hi",
        "It compiles, but a non-public class can't be run"
      ],
      ans: 2,
      layers: [
        { t: "Only public classes must match", h: "<p>The rule is narrower than most people think: a <b>public</b> top-level class must live in a file of the same name. Non-public classes can live in any file.</p>" },
        { t: "Output is named after the class", h: "<p>.class files are always named after the <b>class</b>, never the source file. And the launcher doesn't need <code>Apple</code> to be public; it needs <code>main</code> to be public and static.</p>" },
        { t: "Why the rule exists", h: "<p>So the compiler can <b>find</b> public classes: if another file uses <code>Apple</code>, javac knows to look for <code>Apple.java</code>. It's a lookup convention turned into a rule, much like packages mapping to folders.</p>" }
      ]
    },
    bytename: {
      id: "bytename",
      stem: "Why is it called <b>byte</b>code?",
      opts: [
        "Because file sizes are measured in bytes",
        "Each instruction's opcode fits in one byte, so there can be at most 256 kinds of instruction",
        "It's compiled one byte at a time",
        "It was named after BYTE magazine"
      ],
      ans: 1,
      layers: [
        { t: "One byte per opcode", h: "<p>Every instruction starts with a single-byte opcode: <code>iadd</code> is <code>0x60</code>. That allows at most 256 instructions, and about 200 are defined. A tiny instruction set was easy to implement on every device, which was the original toaster goal.</p>" },
        { t: "Some have operands", h: "<p>An opcode can be followed by operand bytes: <code>bipush 100</code> is <code>0x10 0x64</code>. But the most common operations, like <code>iconst_2</code> and <code>iload_1</code>, bake their argument into the opcode itself to save space.</p>" },
        { t: "CAFE strikes again", h: "<p>Opcode <code>0xCA</code> is reserved as <code>breakpoint</code> for debuggers, and <code>0xFE</code>/<code>0xFF</code> are <code>impdep1</code>/<code>impdep2</code>, reserved for the JVM's internal use. Those reserved opcodes are CA FE … FF.</p>" }
      ]
    },
    jlink: {
      id: "jlink",
      stem: "Your production server only <b>runs</b> Java apps and never compiles. On modern Java (11+), what's the leanest way to ship a runtime?",
      opts: [
        "Download \"JRE 11\" from Oracle",
        "Install the full JDK. There's no other option",
        "Use jlink to build a custom runtime containing only the modules your app needs",
        "Copy just the JVM library file"
      ],
      ans: 2,
      layers: [
        { t: "JDK ⊃ JRE ⊃ JVM", h: "<p><b>JVM</b>: the engine. <b>JRE</b>: engine + standard library. <b>JDK</b>: JRE + tools (<code>javac</code>, <code>jar</code>, <code>jshell</code>, <code>jlink</code>). Oracle stopped shipping a separate JRE with Java 11, though some vendors such as Temurin still publish JRE builds.</p>" },
        { t: "Modules made runtimes modular", h: "<p>Java 9 split the JDK into dozens of modules. <code>jlink</code> assembles a runtime containing only <code>java.base</code> plus what your app actually uses, often a fraction of the full JDK's size.</p>" },
        { t: "Why containers love it", h: "<p>Smaller images pull faster, start faster, and have a smaller attack surface: code that isn't shipped can't be exploited. The same \"ship only what you touch\" idea as lazy class loading, applied to deployment.</p>" }
      ]
    }
  },
  bonus: ["banana", "bytename", "jlink"],

  /* ======================= LANDING ======================= */
  landing: {
    h: "You just followed one program from the keyboard to the CPU.",
    p: "Before you go, pull it back out of your head. Retrieval, not rereading, is what builds lasting memory.",
    recall: "In one sentence: why does Java need a JVM at all?",
    model: "Because real chips speak different machine languages. Java compiles once to bytecode for an imaginary chip, and a JVM built for each real platform plays that bytecode, verifying it first and compiling the hot parts to native code as it runs.",
    points: [
      "Every chip speaks its own machine language. That was the toaster problem.",
      "Java compiles to bytecode for an imaginary stack machine. The JVM is the per-platform player.",
      "One class, one .class file, starting with CAFEBABE and a version number (Java + 44).",
      "Class loaders fetch classes lazily, parent first: Bootstrap → Platform → Application.",
      "The verifier trusts no bytes. Bad bytecode never runs.",
      "The JVM interprets first, then JIT-compiles hot spots, even mid-loop (OSR).",
      "The JVM only speaks bytecode, so many languages share one engine."
    ],
    brain: [
      ["Curiosity gaps", "Every scene opens a question before answering it. A known gap creates a mild itch, and the brain is more receptive in the moment just before the answer arrives."],
      ["Prediction error", "Dopamine responds most when an outcome differs from what you predicted. Committing to an answer before the reveal creates that prediction."],
      ["Pretesting", "Some questions came before the lesson. Guessing wrong before learning still improves later recall compared with reading cold."],
      ["Hypercorrection", "Rating your confidence matters: errors made with high confidence are corrected more strongly than low-confidence ones."],
      ["Urgency without punishment", "The hourglass adds challenge and focus (what ADHD attention runs on), but running out of sand costs nothing. Fear narrows thinking; mild urgency sharpens it."],
      ["Adaptive challenge", "The sand speeds up when you answer fast and slows when you miss, to keep you between boredom and anxiety, where flow happens."],
      ["Spaced retrieval", "Misses came back a few scenes later with shuffled options. Pulling something out after a gap is what moves it into long-term memory."],
      ["Layered depth", "Layers are optional. You decide how far down to go. That sense of control is one of flow's conditions."]
    ],
    teaser: "Your program is running. But where do your objects actually <i>live</i>? Chapter 2: the heap, the stack, and the garbage collector that silently eats what you forget."
  }
};
