package parser

import (
	"bufio"
	"fmt"
	"io"
	"os"

	"github.com/actions/workflow-parser/model"
	ghparser "github.com/actions/workflow-parser/parser"
)

// LoadData load workflow file and parse it
func LoadData() *model.Configuration {
	var r io.Reader
	if isDataFromStdin() {
		r = LoadDataFromStdin()
	} else {
		r = LoadDataFromFile()
	}

	data, err := ghparser.Parse(r)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}

	return data
}

func isDataFromStdin() bool {
    file := os.Stdin
    fi, err := file.Stat()
    if err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}
	
	return fi.Size() > 0
}

func LoadDataFromStdin() io.Reader {
	reader := bufio.NewReader(os.Stdin)

	return reader
}

func LoadDataFromFile() io.Reader {
	r, err := os.Open(".github/main.workflow")
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}
	
	return r
}