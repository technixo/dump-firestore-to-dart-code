const parseFucntion = require('../parse-firestore-to-dart')

describe('Firestore document', () => {
    it('should get data success', function () {
        return parseFucntion('/posts/0vMvmrVTOS1rPqcp5JRG').then(
            data => {
                console.log(data)
            }
        )
    });
});