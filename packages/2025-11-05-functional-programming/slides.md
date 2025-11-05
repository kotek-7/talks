---
theme: ./slidev-theme-penguin
colorSchema: dark
canvasWidth: 980
title: オブジェクト指向の限界と関数型プログラミングの可能性
info: |
  ## Slidev Starter Template
  Presentation slides for developers.

  Learn more at [Sli.dev](https://sli.dev)
drawings:
  persist: false
transition: slide-left
mdc: true
duration: 35min
layout: intro
---

# オブジェクト指向の限界と関数型プログラミングの可能性

なぜ今Rustが注目されるのか？  
そしてTypeScriptで関数型プログラミングを実践する方法

<!--
The last comment block of each slide will be treated as slide notes. It will be visible and editable in Presenter Mode along with the slide. [Read more in the docs](https://sli.dev/guide/syntax.html#notes)
-->

---
layout: presenter
presenterImage: https://avatars.githubusercontent.com/u/62449493
twitter: "@kotek**D"
twitterUrl: https://x.com/kotek**D
---

# 自己紹介

<span font-bold text-2xl>
鈴木 倖人 (こうと)
</span>

<p>
STAR UP でフロントエンドエンジニアをしています。
</p>

- 好きなもの: web技術、スイーツ、ランニング
- <a href="https://github.com/kotek-7" flex items-center w-fit><logos-github-icon mr-1 />kotek-7</a>

---

## オブジェクト指向してますか？

<div mt-8 flex flex-col mx-auto w-fit items-center gap-1>
  <img src="/oop-ramen.png" style="width: 360px;" />
  <a href="https://atmarkit.itmedia.co.jp/ait/articles/0805/08/news152_3.html" text-sm>「いまさら聞けないJavaによるオブジェクト指向の常識」 ITmedia</a>
</div>

---

## オブジェクト指向プログラミングのありふれた例

<div flex gap-8 justify-center mt-8>
<div>

```java [animal.java]
class Animal {
    String name;

    void makeSound() {
        // 動物ごとに異なる鳴き声を出す
    }
}
```

</div>

<div>

```java [dog.java]
class Dog extends Animal {
    void makeSound() {
        System.out.println("Woof!");
    }
}
```

</div>
</div>

<div v-click class="mt-8 text-center bg-white/80 text-xl  text-black py-4 px-8 rounded-lg w-fit mx-auto">
→ 実は、現在ではあまり良い例ではないとされている
</div>

---

# 目次

1. オブジェクト指向神話
2. テスト駆動開発の台頭とオブジェクト指向プログラミングの変化
3. 結局、「オブジェクト指向って必要…？」
4. 脚光を浴びる関数型プログラミング
5. なぜ今Rustが注目されるのか？
6. TypeScriptで関数型プログラミングを実践する方法

---
layout: new-section
---

<div class="mt-32">

# オブジェクト指向神話

</div>

---

## オブジェクト指向の登場

<div class="bg-white/90 text-black p-8 rounded-lg mt-8">
  <h3>
    C++ 登場 (1983年)
  </h3>
  <h3 mt-2 v-click>
    Java 登場 (1995年)
  </h3>
  <div class="mt-4 text-xl" v-click>
    → オブジェクト指向プログラミング (OOP) の機運が爆発！
  </div>
  <ul v-click class="mt-4">
    <li>すべてのソフトウェアはオブジェクトの集まりとして設計されるべき</li>
    <li>なんでもかんでもオブジェクトにしよう！</li>
  </ul>
  <p v-click class="mt-8 text-2xl">
    「オブジェクト指向プログラミングは万能であり、<br>救世主である――――。」
  </p>
</div>

---

<h2>当時のオブジェクト指向プログラミング</h2>

当時のオブジェクト指向プログラミングでは、継承が多用されていました。

<h3 v-click>継承の例 (Pokemon クラスと Pikachu クラス)</h3>

<div flex gap-4 justify-center mt-4>
<div overflow-x-auto v-click>

```java [pokemon.java]
class Pokemon {
    String name;

    // ステータス表示
    void showStatus() {
        System.out.println(name + "のステータス");
    }

    // 鳴く
    void cry() {
        System.out.println(name + "が鳴いた！");
    }
}
```

</div>

<div overflow-x-auto v-click>

```java [pikachu.java]
class Pikachu extends Pokemon {
    // 10まんボルト
    void thunderShock() {
        System.out.println(name + "の10まんボルト！");
    }
}
```

</div>
</div>

---

<h2 >
継承の問題点
</h2>

<div flex mt-8 gap-8>

<div>
<ul class="text-2xl">
<li mt-2 v-click>Pokemon クラスを変更すると、すべてのサブクラスに影響が及ぶ</li>
<li mt-2 v-click>Pikachu クラスだけを見たときに、Pokemon クラスの実装がわからない</li>
</ul>

<div v-click="4" class="text-2xl mt-8 bg-white/80 text-black py-4 px-8 rounded-lg w-fit mx-auto transition">
→ 継承は徐々に避けられるようになっていく
</div>

</div>

<div>

````md magic-move [pikachu.java]
```java [pikachu.java]
class Pikachu extends Pokemon {
  // 10まんボルト
  void thunderShock() {
    System.out.println(name + "の10まんボルト！");
  }
}
```

```java [pikachu.java] {1,14-18}
class Pikachu extends Pokemon {
  String name;

  // ステータス表示
  void showStatus() {
    System.out.println(name + "のステータス");
  }

  // 鳴く
  void cry() {
    System.out.println(name + "が鳴いた！");
  }

  // 10まんボルト
  void thunderShock() {
    System.out.println(name + "の10まんボルト！");
  }
}
```
````

</div>
</div>

---
layout: new-section
---

<div mt-32>
<h1>
テスト駆動開発の台頭とオブジェクト指向プログラミングの変化
</h1>
</div>

---

<h2>テスト駆動開発 (TDD) の登場</h2>

<ul mt-8 text-xl>
<li>
テスト駆動開発 (TDD: Test-Driven Development) は、2002年にケント・ベックによって提唱されたソフトウェア開発手法
</li>
<li>
TDD では、まずテストケースを作成し、その後にコードを実装してテストをパスさせることを繰り返す
</li>
</ul>

<div v-click class="mt-8 text-center bg-white/80 text-2xl  text-black py-4 px-8 rounded-lg w-fit mx-auto">
この頃から、テスト可能性へ関心が集まり、<br>オブジェクト指向プログラミングも次第に変化してく
</div>

---

<h2>オブジェクト指向プログラミングの変化</h2>

<div class="flex gap-8 w-full justify-center">

<div class="w-1/2">
<div mt-4 overflow-x-auto>

````md magic-move
```java
// 旧来のオブジェクト指向プログラミング

import database.Database;

class UserService {
  void createUser(String name) {
    db.insert("INSERT INTO users (name) VALUES ('" + name + "')");
  }
}
```

```java {3-4}
// 旧来のオブジェクト指向プログラミング

// 直接 Database に依存している
import database.Database;

class UserService {
  void createUser(String name) {
    db.insert("INSERT INTO users (name) VALUES ('" + name + "')");
  }
}
```

```java {8-10}
// 旧来のオブジェクト指向プログラミング

// 直接 Database に依存している
import database.Database;

class UserService {
  void createUser(String name) {
    // 外部ライブラリを直接使ってユーザーをデータベースに保存
    // ここで副作用が発生
    db.insert("INSERT INTO users (name) VALUES ('" + name + "')");
  }
}
```
````

</div>

<div class="mt-4 text-center bg-white/80 text-xl  text-black py-4 px-8 rounded-lg w-fit mx-auto transition" v-click>
副作用が直接コード内に存在！<br> = テストが困難
</div>
</div>

<div class="w-1/2">

<div mt-4 overflow-x-auto>

````md magic-move
```java
// 新しいオブジェクト指向プログラミング

interface Database {
  void insert(String query);
}

class UserService {
  void createUser(Database db, String name) {
    // ユーザーをデータベースに保存
    db.insert("INSERT INTO users (name) VALUES ('" + name + "')");
  }
}

```

```java {3-6}
// 新しいオブジェクト指向プログラミング

// Database を抽象化したインターフェース
interface Database {
  void insert(String query);
}

class UserService {
  void createUser(Database db, String name) {
    // ユーザーをデータベースに保存
    db.insert("INSERT INTO users (name) VALUES ('" + name + "')");
  }
}
```

```java {9-10}
// 新しいオブジェクト指向プログラミング

// Database を抽象化したインターフェース
interface Database {
  void insert(String query);
}

class UserService {
  // Database を外部から注入 (Dependency Injection)
  void createUser(Database db, String name) {
    // ユーザーをデータベースに保存
    db.insert("INSERT INTO users (name) VALUES ('" + name + "')");
  }
}
```
````

</div>

<div class="mt-4 text-center bg-white/80 text-xl  text-black py-4 px-8 rounded-lg w-fit mx-auto transition" v-click>
インターフェースを引数に指定して<br>副作用を差し替え可能に！<br> = テストが容易に
</div>
</div>
</div>

---

## 具体例 その2

<div class="flex gap-8 w-full justify-center" depth="3">
<div >
<div mt-8>

````md magic-move
```java{*|4}
// 旧来のスタイル
class OrderService {
  void processOrder(Order order) {
    PaymentGateway paymentGateway = new PaymentGateway();
    paymentGateway.charge(order.getAmount());
  }
}
```

```java{4-5}
// 旧来のスタイル
class OrderService {
  void processOrder(Order order) {
    // ここで具体的な PaymentGateway クラスに依存している
    PaymentGateway paymentGateway = new PaymentGateway();
    paymentGateway.charge(order.getAmount());
  }
}
```
````

````md magic-move
```java {*|7}
// 新しいスタイル
interface PaymentGateway {
  void charge(double amount);
}

class OrderService {
  void processOrder(PaymentGateway paymentGateway, Order order) {
    paymentGateway.charge(order.getAmount());
  }
}
```

```java {7-9}
// 新しいスタイル
interface PaymentGateway {
  void charge(double amount);
}

class OrderService {
  // PaymentGateway インターフェースを満たすオブジェクトを外部から注入
  // (Dependency Injection)
  void processOrder(PaymentGateway paymentGateway, Order order) {
    paymentGateway.charge(order.getAmount());
  }
}
```
````

</div>
</div>

<div class="text-center bg-white/80 text-xl text-black py-4 px-4 rounded-lg w-fit h-fit mt-40 transition" v-click>
インターフェースを利用して依存性注入を行うことで、テストが容易に！
</div>
</div>

<!--
具体クラスに直接依存する旧来のスタイルと、インターフェースを利用して依存性注入を行う新しいスタイルの対比を示すコード例。
-->

---

## オブジェクト指向プログラミングのジレンマ

<div text-xl mt-4>
一方で、具体的なクラスを完全に排除して、インスタンス化を一切行わない究極のコードは…
</div>

<div class="flex gap-8 justify-center">
<div class="mt-4 overflow-y-auto h-100 flex-2" v-click>

```java [app.java]
import database.DatabaseImpl;
import email.EmailServiceImpl;
// ...

class App {
  // プロジェクトのエントリーポイント
  void run() {
    startService(
      new UserService(
        new DatabaseImpl(
          new QueryBuilder(
            Configuration.getDbConfig("primary", Environment.getCurrent())
          ),
          new ConnectionPool()
          // ...
        ),
        new AuthService(
          new UserRepository(
            new DatabaseImpl(
              new QueryBuilder(
                Configuration.getDbConfig("primary", Environment.getCurrent())
              ),
              new ConnectionPool()
              // ...
            )
          )
        new EmailServiceImpl()
        // ...
      )
    );
  }
}
```

</div>
<div class="mt-40 text-center bg-white/80 text-xl  flex-1  text-black py-4 px-8 rounded-lg transition h-fit" v-click>
すべてのインスタンス化がルートに集約されてしまい、コードの可読性と保守性が著しく低下 😢
</div>
</div>

<!--
具体的なクラスを完全に排除して、インスタンス化を一切行わなくした結果、ルートにすべてのインスタンス化が集約されてしまい、コードの可読性と保守性が著しく低下する例。
-->

---
layout: new-section
---

<div mt-32>
<h1>結局、「オブジェクト指向って必要…？」</h1>
</div>

---

# テスト可能性から見たオブジェクト指向プログラミングの本質的な課題

<div class="mt-20 text-2xl" style="line-height: 2.0;" v-click>
オブジェクト思考プログラミングの根本的な課題は、<br><span class="text-5xl font-bold">状態をもつオブジェクトが副作用を引き起こし、テストを困難にする</span> 点にある
</div>

---

## オブジェクト指向プログラミング、本当に必要？

<div mt-32 class="text-center bg-white/80 text-3xl  text-black py-8 px-12 rounded-lg w-fit mx-auto transition" v-click>
開発者たちは、システムをクラスとオブジェクトの集まりとして表現することに限界を感じるように…
</div>
<div mt-8 class="text-center text-4xl" v-click>

→ 次のパラダイム、 **関数型言語** へ

</div>

---

## 関数型言語の再発見

<div mt-8 class="text-2xl">

- Haskell や Lisp などの関数型言語は、1950年代から存在していた
- 近年、関数型プログラミングの利点が再評価されている

</div>

---

## テスト可能性からみた関数型プログラミングの特徴

<div class="text-xl mt-12">

- 関数型プログラミングでは、副作用を持たない **純粋関数** を重視

</div>

<div class="mt-8">

```ts 
// 純粋関数の例
function add(a: number, b: number): number {
  return a + b; // 副作用なし
}
```

</div>

<div class="mt-8 text-center bg-white/80 text-2xl text-black py-4 px-8 rounded-lg w-fit mx-auto transition" v-click>
状態を変更しないため、同じ入力に対して常に同じ出力を返す。<br>→ テストが非常に容易
</div>

<div class="mt-8 font-bold text-6xl text-center" v-click>
近年大注目！
</div>



---
layout: new-section
---

<div mt-32>

# Rust にみられる関数型プログラミングの特徴と TypeScript での実践

</div>

---

## なぜ今 Rust が注目されるのか？

<div class="mt-8 text-2xl">

<ul>
<li> Result 型や Option 型、イミュータビリティ、パターンマッチングなど、副作用を分離する関数型プログラミングの概念が豊富に存在 </li>
</ul>

<div class="mt-16 text-center bg-white/80 text-2xl  text-black py-8 px-16 rounded-lg w-fit mx-auto transition" v-click>
これらの特徴は TypeScript でも実践可能！<br> → よりテストしやすく保守性の高いコードへ
</div>

</div>

---

## レベル1: Rust のイミュータビリティ

<div>
<div class="mt-8">

Rust では、デフォルトで変数は **イミュータブル (不変)** 
</div>

<div class="mt-4 overflow-x-auto">
```rs
let x = 5; // イミュータブル変数
x = 10;    // エラー: 再代入はできない
```
</div>
</div>

<div v-click>
<div  class="mt-4">

変数の変更は明示的に **ミュータブル (可変)** として宣言する必要がある
</div>
<div  class="mt-4">
```rs
let mut y = 5; // ミュータブル変数
y = 10;         // OK: 再代入可能
```
</div>
</div>

<div class="mt-8 text-center bg-white/80 text-2xl  text-black py-4 px-8 rounded-lg w-fit mx-auto transition" v-click>
変数の変更は大きな副作用の1つ！
</div>


---

## TypeScript でのイミュータビリティの実践

<div mt-8>

```ts
// イミュータブル変数
const x = 5;
x = 10; // エラー: 再代入はできない

```
</div>

<div class="mt-8 text-center bg-white/80 text-2xl  text-black py-4 px-8 rounded-lg w-fit mx-auto transition" v-click>
const を使おうという話でした
</div>

---

## レベル2: Rust の Result 型

<h3 mt-8>Rust の Result 型の定義</h3>

<div mt-8 text-xl>


```rs
// Rust の Result 型の定義
enum Result<T, E> {
    Ok(T),    // 成功を表すバリアント
    Err(E),   // エラーを表すバリアント
}
```

```ts
// TypeScript の場合
type Result<T, E> = 
  | { type: 'ok'; value: T }    // 成功を表す型
  | { type: 'err'; error: E };  // エラーを表す型
```
</div>



---

<h3 mt-8>Result 型を使った関数の例</h3>

<div mt-8 text-xl>

```rs {class:"w-full"}
// 割り算をする関数。
// 通常の場合は結果の入った Ok を返し、ゼロ除算の場合は Err を返す。
fn divide(a: f64, b: f64) -> Result<f64, String> {
  if b == 0.0 {
    Err("Division by zero".to_string())
  } else {
    Ok(a / b)
  }
}

fn main() {
  match divide(10.0, 2.0) {
    Ok(result) => println!("Result: {}", result),  // Ok が返ってきたとき
    Err(e) => println!("Error: {}", e),            // Err が返ってきたとき
  }
}
```
</div>

<div class="mt-4 text-center bg-white/80 text-xl  text-black py-2 px-4 rounded-lg w-fit mx-auto transition" v-click>
成功・失敗という副作用にともなう効果を型で表すことで、副作用を持つ関数をシグネチャで表すことができる！
</div>

---
layout: center
---

<div class="mt-16 text-4xl font-bold text-center" style="line-height: 1.5;"><a href="https://github.com/supermacro/neverthrow">neverthrow</a> という TypeScript ライブラリがあります</div>

--- 

<h2>neverthrow を使った TypeScript での Result 型の利用例</h2>

<div mt-4 v-click>

```ts {class:"w-full"}
import { ok, err, Result } from 'neverthrow';

// 割り算をする関数。
// 通常の場合は結果の入った Ok を返し、ゼロ除算の場合は Err を返す。
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return err("Division by zero");
  } else {
    return ok(a / b);
  }
}

function main() {
  const result = divide(10, 2);
  result.match(
    (value) => console.log(`Result: ${value}`), // Ok が返ってきたとき
    (error) => console.log(`Error: ${error}`)   // Err が返ってきたとき
  );
}
```
</div>

<div class="mt-2 text-center text-2xl font-bold  rounded-lg w-fit mx-auto transition" v-click>
ポイント: throw でエラーを投げず、Result 型を使ってエラーを返すことで、副作用を明示的に扱うことができる。</div>


---

# ご清聴ありがとうございました！

---

<a href="https://github.com/kotek-7/talks">このスライドのリポジトリ</a>