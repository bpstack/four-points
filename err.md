[{
	"resource": "/c:/Users/dz/projects/Four-Points/backend/index.ts",
	"owner": "typescript",
	"code": "2344",
	"severity": 8,
	"message": "Type '{ config_value: string; }[]' does not satisfy the constraint 'QueryResult'.\n  Type '{ config_value: string; }[]' is not assignable to type 'OkPacket | ResultSetHeader | ResultSetHeader[] | RowDataPacket[] | RowDataPacket[][] | OkPacket[]'.\n    Type '{ config_value: string; }[]' is not assignable to type 'ResultSetHeader[]'.\n      Type '{ config_value: string; }' is missing the following properties from type 'ResultSetHeader': affectedRows, fieldCount, info, insertId, and 3 more.",
	"source": "ts",
	"startLineNumber": 192,
	"startColumn": 35,
	"endLineNumber": 192,
	"endColumn": 66,
	"origin": "extHost1"
}]