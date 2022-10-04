package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/fulll/actions/github-workflow/parser"
	"github.com/spf13/cobra"
)

// Output alternative to default path
var Output string

// GithubWorkflowPath Github workflow file path
const GithubWorkflowPath = ".github/main.workflow"

var rootCmd = &cobra.Command{
	Use:   "github-workflow",
	Short: "Manage Github Action workflows and actions by cli. Allows you to script edition.",
	Long:  ``,
}

var lintCmd = &cobra.Command{
	Use:     "lint",
	Short:   "Check file integrity",
	Aliases: []string{"l"},
	Run: func(cmd *cobra.Command, args []string) {
		parser.LoadData()
		fmt.Fprint(os.Stderr, "Configuration 👌")
	},
}

var initCmd = &cobra.Command{
	Use:     "initialize",
	Short:   "Initialize file integrity",
	Aliases: []string{"i", "init"},
	Run: func(cmd *cobra.Command, args []string) {
		if _, err := os.Stat(GithubWorkflowPath); os.IsNotExist(err) {
			dir := filepath.Dir(GithubWorkflowPath)
			err := os.MkdirAll(dir, 0755)
			if err != nil {
				fmt.Fprintf(os.Stderr, "%s\n", err)
				os.Exit(1)
			}
			emptyFile, err := os.Create(GithubWorkflowPath)
			if err != nil {
				fmt.Fprintf(os.Stderr, "%s\n", err)
				os.Exit(1)
			}
			emptyFile.Close()
		}
	},
}

// Execute main cmd function
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func init() {
	rootCmd.PersistentFlags().StringVarP(&Output, "output", "d", GithubWorkflowPath, "Output path")

	rootCmd.AddCommand(lintCmd)
	rootCmd.AddCommand(initCmd)
	rootCmd.Version = "2019.12.1"
}
