
/**
 * The State Array Class represents an input-block state and its sole purpose is to encapsulate
 * the logic behind input-block state transition. The bonus is that you can potentially construct
 * a state array from any type of collection as long as it lets you build a square matrix from
 * its elements  
 */
class StateArray {
    /**
     * Constructor of the {StateArray} class
     * @param {collection} bytes - The bytes you want to construct a state array from 
     */
    constructor(bytes){

        const INVALID_SIZE = `The State Array allows only square matrices.`
         + ` You cannot build a square matrix of length ${bytes.length}`;

        if(bytes.length % 2 !== 0){
            throw Error(INVALID_SIZE);
        }

        this._matrix = [];

        this._build(bytes);

    }
    /**
     * Builds the state array (multidimensional) from the provided bytes collection.
     * It is imperative that the indexing operator is defined for the collection.
     * The matrix is filled column-wise not row-wise.
     * @param {collection} bytes - The bytes you want to use
     */
    _build(bytes){

        // Because we checked, we assume bytes.length is a positive even number
        let dimens = Math.sqrt(bytes.length);
        for(let row = 0; row < dimens; row++){
            this._matrix.push([]);
        }

        let iterator = 0;
        for(let col = 0; col < dimens; col++){

            for(let row = 0 ; row < dimens ; row++){
                this._matrix[row][col] = bytes[iterator];
                iterator++;
            }

        }

        this.rows = dimens;
        this.cols = dimens;
        this.dimens = dimens;
        this.size = bytes.length;

    }

    /**
     * @author Georgi Angelov
     * 
     * This function returns the element of state array that is at the specified position.
     * This function cannot change the state of the state array.
     * 
     * For state change use @see set
     * 
     * @throws Error, if the arguments you provide are out of range
     * 
     * @param {number} row 
     * @param {number} col 
     */
    at(row, col){

        this._outOfBounds(col)
        this._outOfBounds(row);

        return this._matrix[row][col];

    }
    /**
     * 
     * @author Georgi Angelov
     * 
     * This function changes the state of the state array. It changes the element at
     * {row]{col} with the element you provide.
     * 
     * @throws Error, if the arguments you provide are out of range
     * 
     * @param {number} row 
     * @param {number} col 
     * @param {number} element 
     */
    set(row, col, element){

       this._outOfBounds(row);
       this._outOfBounds(col);

       this._matrix[row][col] = element;
    }

    /**
     * Shifts the rows of the state array to the left *circularly.
     * You can shift every row differently. You just specify a shift schedule
     * E.g [1, 2, 7, 9] - This will shift the first row - once, the second row - twice, etc.
     * 
     * @param {object} shifts - The specified number of shifts for every row
     */
    shiftRowsLeft(shifts){


        if(shifts.length > this.rows){
            throw Error(`The number of row shifts exceeds the rows in the State Array`);
        }

        for(let i = 0 ; i < shifts.length ; i++){
            this._shiftRowCircular(i, shifts[i], 'l');
        }


    }
    /**
     * Shifts the columns of the state array up *circularly.
     * You can shift every column differently. You just specify a shift schedule
     * E.g [1, 2, 7, 9] - This will shift the first column - once, the second column - twice, etc.
     * 
     * @param {object} shifts - The specified number of shifts for every column
     */
    shiftColumnsUp(shift){

        if(shifts.length > this.cols){
            throw Error(`The number of column shifts exceeds the columns in the State Array`);
        }

        for(let i = 0 ; i < shifts.length ; i++){
            this._shiftColumnCircular(i, shifts[i], 'u');
        }

    }
    /**
     * Shifts the rows of the state array to the right *circularly.
     * You can shift every row differently. You just specify a shift schedule
     * E.g [1, 2, 7, 9] - This will shift the first row - once, the second row - twice, etc.
     * 
     * @param {object} shifts - The specified number of shifts for every row
     */
    shiftRowsRight(shifts){

        if(shifts.length > this.dimens){
            throw Error(`The number of row shifts exceeds the rows in the State Array`);
        }

        for(let i = 0 ; i < shifts.length ; i++){
            this._shiftRowCircular(i, shifts[i], 'r');
        }

    }
    /**
     * Utility function that returns the byte word (column) at a specific index as a list of bytes
     * @param {number} index - The column index 
     */
    getColumn(index){

        let column = [];

        for(let row = 0; row < this.dimens; row++){
            column[row] = this._matrix[row][index];
        }

        return column;
    }
    /**
     * Substitutes the bytes in the given column with other bytes using a function y = F(x) that is defined
     * outside of the StateArray class. You can basically provide a delegate that will take the old byte as an
     * input and return a new byte to substitute. 
     * 
     * @param {number} index - The index of the column
     * @param {Function} func - The delegate that provides the swap function
     * 
     */
    substituteColumn(index, func){

        for(let row = 0; row < this.dimens; row++){
            let byte = this._matrix[row][index];
            this._matrix[row][index] = func(byte); 
        }

    }
    /**
     * This function xors' the current state array with the provided state array.
     * This can happen ony if the current state array and the provided one are of equal dimensions.
     * It is like matrix addition where addition is carried in GF(2^8) where addition is represented
     * by bitwise XOR. 
     * 
     * 
     * @param {StateArray} state - The state array you want to XOR with
     */
    xor(state){
        for(let row = 0; row < state.dimens; row++){
            for(let col = 0; col < state.dimens; col++){
                let thisByte = this._matrix[row][col];
                // This ensures the equal dimensions condition @see at
                let otherByte = state.at(row,col);
                this._matrix[row][col] = thisByte ^ otherByte;    
            }
        }

    }
    /**
     * 
     * This function is used only internally and it shifts a single row n times in specified direction.
     * @throws OutOfBoundsError if the index is out of bounds.
     * It does nothing if the specified direction is invalid
     * 
     * @example Direction can only take values ('l', 'left', 'r', 'right'). For other values the function is 
     * not defined.
     * 
     * @param {number} index - The index of the row
     * @param {number} shifts - The number of circular shifts it should apply
     * @param {string} direction - The direction of the shifts
     */
    _shiftRowCircular(index, shifts, direction){

        let actualShifts = shifts % this.dimens;

        this._outOfBounds(index);

        if(['left', 'l'].includes(direction)){
            for(let i = 0 ; i < actualShifts; i++){
                let element = this._matrix[index].shift();
                this._matrix[index].push(element);
            }

        }else if(['right', 'r'].includes(direction)){
            for(let i = 0 ; i < actualShifts; i++){
                let element = this._matrix[index].pop();
                this._matrix[index].unshift(element);
            }
        }

    }
    /**
     * 
     * This function is used only internally and it shifts a single column n times in specified direction.
     * @throws OutOfBoundsError if the index is out of bounds.
     * It does nothing if the specified direction is invalid
     * 
     * @example Direction can only take values ('u', 'up', 'd', 'down'). For other values the function is 
     * not defined.
     * 
     * The complexity of this might be terrible, but w/e. If I think of better way of doing this i might
     * change. It's about O(3*n + c) where c is a negligent number. I am pretty sure you can do it in O(n + c)
     * 
     * I assume that lists in javascript behave like linked lists ~ O(1) removeFirst,addFirst
     * 
     * @param {number} index - The index of the column
     * @param {number} shifts - The number of circular shifts it should apply
     * @param {string} direction - The direction of the shifts
     */
    _shiftColumnCircular(index, shifts, direction){

        let actualShifts = shifts % this.dimens;

        this._outOfBounds(index);

        let r = [];
        for(let row = 0 ; row < this.dimens; row++){
            row.push(this._matrix[row][index]);
        }
        

        if(['up', 'u'].includes(direction)){
            for(let i = 0 ; i < actualShifts; i++){
                let element = r.shift();
                r.push(element);
            }

        }else if(['down', 'd'].includes(direction)){
            for(let i = 0 ; i < actualShifts; i++){
                let element = r.pop();
                r.unshift(element);
            }
        }

        for(let i = 0 ; i < this.dimens; i++){
            this._matrix[i][index] = r[i];
        }

    }

    _outOfBounds(index){
        
        const OUT_OF_BOUNDS =`The provided column/row index was out of boundaries. `
        + `Expected value between 0 and ${Math.sqrt(this.size)}`;

        if(index < 0 || index >= this.dimens){
            throw Error(OUT_OF_BOUNDS);
        }

    }
    /**
     * This function transforms the state array into a buffer object so that you can work with the actual
     * bytes of the state.
     */
    toBuffer(){

        let bytes = [];

        for(let row = 0; row < this.dimens; row++){
            for(let col = 0; col < this.dimens; col++){

                bytes.push(this._matrix[col][row]);

            }
        }

        return Buffer.from(bytes);

    }
    /**
     * This function uses the toBuffer function to create a deep copy of the current state. It is used
     * when preservation of state is needed.
     */
    deepCopy(){
        return new StateArray(this.toBuffer());
    }

}

module.exports = StateArray;