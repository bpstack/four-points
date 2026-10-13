// types/pdf-parse.d.ts

// services/fnb/pdf-parser.service.ts imports the function from lib/ to skip
// the package's debug block; @types/pdf-parse only types the entry point
declare module 'pdf-parse/lib/pdf-parse.js' {
  import pdfParse from 'pdf-parse'
  export default pdfParse
}
