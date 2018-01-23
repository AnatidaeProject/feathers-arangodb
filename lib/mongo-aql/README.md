# mongo-aql - JSON to AQL

##Install

```
$ npm i mongo-aql --save
```

##Usage

```javascript
var builder = require('mongo-aql');

var q = {
	foo: { bar: 'baz', bar2: 'baz2' },
	"$limit": 10,
	"$skip": 100,
	"$orderby": { name: 1, name2: 1 },
	"@city": "cities",
	"@like": "likes"
}

var res = builder('users', q);

```

Result:

```js
{ query: 'FOR u IN users FILTER u.foo.bar == @v0 && u.foo.bar2 == @v1 LIMIT @v2, @v3 SORT u.name ASC, u.name2 ASC LET c0 = DOCUMENT(@@v4, u.city) LET c1 = DOCUMENT(@@v5, u.like) RETURN merge(u, { city: c0 }, { like: c1 })',
  values:
   { v0: 'baz',
     v1: 'baz2',
     v2: 100,
     v3: 10,
     '@v4': 'cities',
     '@v5': 'likes' },
 }

```

##License

BSD
