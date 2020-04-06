module.exports = {
    entry: ['./src/main.js'],
    output: {
        filename: 'bundle.js'
    },
    plugins: [],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            }
        ]
    }
};