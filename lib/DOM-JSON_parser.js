/* ---------------------------- HEADER -----------------------------
Copyright 2019 Pierre LE DU

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see https://www.gnu.org/licenses/.
----------------------------------------------------------------- */


// DOM to JSON parser
class DJ_Parser {
  /*
  *  CONSTRUCTOR
 */
 constructor () {
   // Status of parsing
   this.complete = true
 }


  /*
  *  CONVERT STRING
 */
 // Apply actions on the text
 action_textContent (text, actions = []) {
   for (let i = 0; i < actions.length; i++) {
     switch (actions[i]._type) {
       // Replace param 1 by param 2 in the text
       case 'replace':
       text = text.replace(...actions[i]._params)
       break

       // Search param 1 in the text, if found set param 2 else set param 3
       case 'search':
       if (text.search(actions[i]._params[0])) {
         text = (actions[i]._params[1]) ? actions[i]._params[1] : text
       } else {
         text = (actions[i]._params[2]) ? actions[i]._params[2] : text
       }
       break

       // Split text by param 1, return param 2 index else return text
       case 'split':
       text = text.split(actions[i]._params[0])
       if (actions[i]._params[1]) {
         text = text[actions[i]._params[1]]
       }
       break

       // Concat text with param 2, the sense depends on the param 1
       case 'concat':
       if (actions[i]._params[1] == 'first') {
         text = actions[i]._params[0].concat(text)
       } else {
         text = text.concat(actions[i]._params[0])
       }
       break

       default:
       // Nothing
     }
   }
   return text
 }

 // Convert text to type, apply a trim
 convert_textContent (text, type) {
   //
   if (text === undefined) {
     return text
   }

   switch (type) {
     // Convert string to a number (base 10)
     case 'number':
       return parseFloat(text.replace(',', '.'))
       break

     // Covert string to a date
     case 'date':
       return new Date(`${text} UTC`).toISOString()
       break

     // Trim text by default
     default:
       return text.trim()
   }
 }


  /*
  *    ELEMENT PARSER
 */

 // Parse DOM element from array pattern
 parse_element_array (elements, pattern, current = []) {
   let content = Object.assign({}, pattern)
   let array = []

   // Browse attributes of element
   for (let i = 0; i < elements.length; i++) {
     // Parse attributes from content
     let result = this.parse_element(elements[i], content, [...current, i])
     if (Object.keys(result).length > 0) {
       array.push(result)
     }
   }
   return array
 }


 // Parse DOM element from pattern
 parse_element (element, pattern, current = []) {
   let content = Object.assign({}, pattern)

   // Browse attributes of content
   for (let key in content) {
     let element_target = element

     // Go back nodes of the element
     if (content[key]._parentNode) {
       for (let i = 0; i < content[key]._parentNode | 0; i++) {
         element_target = element_target.parentNode
       }

       // Get element of parent from the selector
       if (content[key]._parent_selectors) {
         let length = current.length - content[key]._parentNode
         let index_target = (length > -1) ? length : 0
         element_target = element_target.querySelectorAll(content[key]._parent_selectors)[current[index_target]]
         if (!element_target) element_target = element
       }
     }

     // Get content element from the selector
     let content_element = (content[key]._selectors) ? element_target.querySelectorAll(content[key]._selectors) : [element_target]
     // Find element index of content
     let index = 0
     if (content[key]._index) {
       index = (content[key]._index < 0) ? content_element.length + content[key]._index : content[key]._index % content_element.length
     }

     // Parse element from query type
     switch (content[key]._query) {
       case 'OBJECT':
         content[key] = this.parse_element(content_element[index], content[key]._content, current)
         break

       case 'ARRAY':
         content[key] = this.parse_element_array(content_element, content[key]._content, current)
         if (content[key] && content[key].length < 1) delete content[key]
         break

       default:
         let textContent = undefined
         try {
           textContent = content_element[index].textContent
         } catch (error) { return {} }

         try {
           // Convert DOM text to type defined in pattern
           textContent = this.action_textContent(textContent, content[key]._actions)
           content[key] = this.convert_textContent(textContent, content[key]._type)
         } catch (error) { content[key] = undefined }
     }

     // Parsing not completed
     if (content[key] === undefined) {
       this.complete = false
     }
   }
   return content
 }
}



// Export: Parse DOM element from pattern
exports.parse = function (element, pattern, callback) {
  let dj_parser = new DJ_Parser()

  // Get result and status of parsing
  let result = dj_parser.parse_element(element, pattern)
  let complete = dj_parser.complete

  return callback(result, complete)
}
